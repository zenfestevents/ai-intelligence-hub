"""Post a reel to Instagram with the official Instagram API (Instagram Login). Free; no video hosting needed.

Reads IG_ACCESS_TOKEN from .env (never prints it). Optional: IG_API_VERSION (default v24.0).

Usage:
  python instagram.py whoami                                   -> checks the token, shows the account
  python instagram.py post <video.mp4> <caption.txt> [--thumb-ms 4600] [--no-feed]
                                                               -> DRY RUN: shows what would be posted
  python instagram.py post <video.mp4> <caption.txt> ... --yes -> actually uploads and publishes
  python instagram.py refresh                                  -> extends the long-lived token by 60 days, saves it to .env

Publishing is public and cannot be undone from here, so it only happens with --yes.
"""
import json
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
ENV = ROOT / ".env"
LOG = ROOT / "output" / "instagram_posts.jsonl"


def env(name: str, default: str | None = None) -> str | None:
    if ENV.exists():
        for line in ENV.read_text(encoding="utf-8-sig").splitlines():
            if line.startswith(f"{name}="):
                return line.split("=", 1)[1].strip()
    return default


def token() -> str:
    t = env("IG_ACCESS_TOKEN")
    if not t:
        sys.exit("IG_ACCESS_TOKEN missing in .env. See tools/INSTAGRAM_SETUP.md.")
    return t


API = f"https://graph.instagram.com/{env('IG_API_VERSION', 'v24.0')}"


def check(r: requests.Response) -> dict:
    try:
        data = r.json()
    except ValueError:
        data = {"raw": r.text[:300]}
    if not r.ok or "error" in data:
        err = data.get("error", data)
        msg = err.get("message", err) if isinstance(err, dict) else err
        sys.exit(f"Instagram API error (HTTP {r.status_code}): {msg}")
    return data


def me() -> dict:
    return check(requests.get(f"{API}/me", params={"fields": "user_id,username,account_type", "access_token": token()}, timeout=30))


def whoami() -> None:
    m = me()
    print(f"Token OK. Account: @{m.get('username')} (id {m.get('user_id')}, {m.get('account_type')})")


def refresh() -> None:
    data = check(
        requests.get(
            "https://graph.instagram.com/refresh_access_token",
            params={"grant_type": "ig_refresh_token", "access_token": token()},
            timeout=30,
        )
    )
    new = data["access_token"]
    lines = ENV.read_text(encoding="utf-8-sig").splitlines()
    lines = [f"IG_ACCESS_TOKEN={new}" if l.startswith("IG_ACCESS_TOKEN=") else l for l in lines]
    ENV.write_text("\n".join(lines) + "\n", encoding="utf-8")
    days = int(data.get("expires_in", 0)) // 86400
    print(f"Token refreshed and saved to .env; valid for about {days} days.")


def post(video: Path, caption: str, thumb_ms: int | None, share_to_feed: bool, confirm: bool) -> None:
    if not video.exists():
        sys.exit(f"video not found: {video}")
    if len(caption) > 2200:
        sys.exit(f"caption is {len(caption)} characters; Instagram allows 2200")
    tags = sum(1 for w in caption.split() if w.startswith("#") and any(ch.isalpha() for ch in w))
    if tags > 5:
        sys.exit(f"caption has {tags} hashtags; Instagram allows 5 (limit since Dec 2025)")
    size = video.stat().st_size
    m = me() if (confirm or env("IG_ACCESS_TOKEN")) else {}
    print(f"Account : @{m['username']}" if m else "Account : (not connected yet: no IG_ACCESS_TOKEN in .env)")
    print(f"Video   : {video.name} ({size / 1_048_576:.1f} MB)")
    print(f"Cover   : frame at {thumb_ms} ms" if thumb_ms is not None else "Cover   : Instagram default")
    print(f"Feed    : {'also shown in profile grid' if share_to_feed else 'Reels tab only'}")
    print(f"Caption : {len(caption)} chars, {tags} hashtags\n---\n{caption}\n---")
    if not confirm:
        print("DRY RUN: nothing was uploaded. Add --yes to publish.")
        return

    ig_id = m["user_id"]
    params = {
        "media_type": "REELS",
        "upload_type": "resumable",
        "caption": caption,
        "share_to_feed": "true" if share_to_feed else "false",
        "access_token": token(),
    }
    if thumb_ms is not None:
        params["thumb_offset"] = str(thumb_ms)
    c = check(requests.post(f"{API}/{ig_id}/media", data=params, timeout=60))
    container, upload_uri = c["id"], c["uri"]
    print(f"1/4 container created: {container}")

    with video.open("rb") as fh:
        up = requests.post(
            upload_uri,
            headers={"Authorization": f"OAuth {token()}", "offset": "0", "file_size": str(size)},
            data=fh,
            timeout=600,
        )
    check(up)
    print("2/4 video uploaded")

    for _ in range(60):  # up to ~5 minutes
        s = check(requests.get(f"{API}/{container}", params={"fields": "status_code,status", "access_token": token()}, timeout=30))
        code = s.get("status_code")
        if code == "FINISHED":
            break
        if code in ("ERROR", "EXPIRED"):
            sys.exit(f"Instagram could not process the video: {s.get('status')}")
        time.sleep(5)
    else:
        sys.exit(f"still processing after 5 minutes; container {container}. Try publishing later.")
    print("3/4 processed by Instagram")

    pub = check(requests.post(f"{API}/{ig_id}/media_publish", data={"creation_id": container, "access_token": token()}, timeout=60))
    media_id = pub["id"]
    info = check(requests.get(f"{API}/{media_id}", params={"fields": "permalink,timestamp", "access_token": token()}, timeout=30))
    print(f"4/4 published: {info.get('permalink')}")
    LOG.parent.mkdir(exist_ok=True)
    with LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps({"media_id": media_id, "permalink": info.get("permalink"), "video": video.name, "time": info.get("timestamp")}) + "\n")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")  # captions contain emoji; Windows consoles default to cp1252
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    cmd = args[0]
    if cmd == "whoami":
        whoami()
    elif cmd == "refresh":
        refresh()
    elif cmd == "post" and len(args) >= 3:
        thumb = int(args[args.index("--thumb-ms") + 1]) if "--thumb-ms" in args else None
        cap = Path(args[2]).read_text(encoding="utf-8").strip()
        post(Path(args[1]), cap, thumb, "--no-feed" not in args, "--yes" in args)
    else:
        sys.exit(__doc__)
