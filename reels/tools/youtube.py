"""Upload a reel to YouTube (as a Short) with the official YouTube Data API v3. Free; uses your daily API quota.

Needs client_secret.json in reels/ (see tools/YOUTUBE_SETUP.md). After the one-time sign-in the
refresh token is saved to .env as YT_REFRESH_TOKEN (never printed).

Usage:
  python youtube.py login                                       -> one-time Google sign-in in your browser
  python youtube.py whoami                                      -> checks the connection, shows the channel
  python youtube.py post <video.mp4> <caption.txt> [options]    -> DRY RUN: shows what would be uploaded
  python youtube.py post <video.mp4> <caption.txt> ... --yes    -> actually uploads

Options for post:
  --title "text"                 title (default: first line of the caption, max 100 characters)
  --privacy public|unlisted|private   (default public; see the note on unverified projects in the setup guide)
  --thumb cover.png              custom thumbnail (only works on a verified channel; skipped with a warning otherwise)
  --synthetic                    tick YouTube's "altered or synthetic content" disclosure
  --category 28                  YouTube category ID (default 28, Science & Technology)

Uploading is public (unless --privacy says otherwise), so it only happens with --yes.
"""
import base64
import hashlib
import http.server
import json
import re
import secrets
import subprocess
import sys
import time
import urllib.parse
import webbrowser
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
ENV = ROOT / ".env"
CLIENT_FILE = ROOT / "client_secret.json"
LOG = ROOT / "output" / "youtube_posts.jsonl"
SCOPES = "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly"
API = "https://www.googleapis.com/youtube/v3"
UPLOAD_API = "https://www.googleapis.com/upload/youtube/v3"
CHUNK = 8 * 1024 * 1024  # upload in 8 MB pieces so a dropped connection only resends one piece
TRIES = 5


def env(name: str, default: str | None = None) -> str | None:
    if ENV.exists():
        for line in ENV.read_text(encoding="utf-8-sig").splitlines():
            if line.startswith(f"{name}="):
                return line.split("=", 1)[1].strip()
    return default


def set_env(name: str, value: str) -> None:
    lines = ENV.read_text(encoding="utf-8-sig").splitlines() if ENV.exists() else []
    if any(l.startswith(f"{name}=") for l in lines):
        lines = [f"{name}={value}" if l.startswith(f"{name}=") else l for l in lines]
    else:
        lines.append(f"{name}={value}")
    ENV.write_text("\n".join(lines) + "\n", encoding="utf-8")


def client() -> dict:
    if not CLIENT_FILE.exists():
        sys.exit(f"{CLIENT_FILE.name} not found in {ROOT}. See tools/YOUTUBE_SETUP.md, step 4.")
    data = json.loads(CLIENT_FILE.read_text(encoding="utf-8"))
    c = data.get("installed") or data.get("web")
    if not c:
        sys.exit("client_secret.json is not an OAuth client file. Create a 'Desktop app' OAuth client (setup guide step 4).")
    return c


def check(r: requests.Response, what: str = "YouTube API") -> dict:
    try:
        data = r.json() if r.content else {}
    except ValueError:
        data = {"raw": r.text[:300]}
    if not r.ok:
        err = data.get("error", data)
        if isinstance(err, dict):
            reason = ", ".join(e.get("reason", "") for e in err.get("errors", []) if e.get("reason"))
            msg = err.get("message", err) + (f" [{reason}]" if reason else "")
        else:
            msg = f"{err} {data.get('error_description', '')}".strip()
        sys.exit(f"{what} error (HTTP {r.status_code}): {msg}")
    return data


# ---------- sign-in ----------

def login() -> None:
    """Installed-app OAuth with PKCE: opens Google sign-in, catches the reply on a local port."""
    c = client()
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    state = secrets.token_urlsafe(16)
    result: dict = {}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            if "code" not in q and "error" not in q:
                self.send_response(404)
                self.end_headers()
                return
            result.update({k: v[0] for k, v in q.items()})
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            msg = "Signed in. You can close this tab and go back to Claude." if "code" in q else "Sign-in was cancelled."
            self.wfile.write(f"<html><body style='font-family:sans-serif'><h2>{msg}</h2></body></html>".encode())

        def log_message(self, *a):
            pass

    server = http.server.HTTPServer(("127.0.0.1", 0), Handler)
    redirect = f"http://127.0.0.1:{server.server_port}"
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
        "client_id": c["client_id"],
        "redirect_uri": redirect,
        "response_type": "code",
        "scope": SCOPES,
        "access_type": "offline",
        "prompt": "consent",  # always return a refresh token
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "state": state,
    })
    print("Opening Google sign-in in your browser. If it doesn't open, paste this link into it:\n" + url + "\n")
    webbrowser.open(url)
    server.timeout = 2
    deadline = time.time() + 300
    while not result and time.time() < deadline:
        server.handle_request()
    server.server_close()
    if not result:
        sys.exit("No answer from the browser within 5 minutes. Run login again.")
    if "error" in result:
        sys.exit(f"Sign-in failed: {result['error']}")
    if result.get("state") != state:
        sys.exit("Sign-in reply did not match this request; run login again.")
    tok = check(requests.post(c.get("token_uri", "https://oauth2.googleapis.com/token"), data={
        "client_id": c["client_id"],
        "client_secret": c.get("client_secret", ""),
        "code": result["code"],
        "code_verifier": verifier,
        "grant_type": "authorization_code",
        "redirect_uri": redirect,
    }, timeout=30), "Google sign-in")
    if "refresh_token" not in tok:
        sys.exit("Google did not return a refresh token. Remove the app at https://myaccount.google.com/permissions and run login again.")
    set_env("YT_REFRESH_TOKEN", tok["refresh_token"])
    print("Signed in; refresh token saved to .env.")
    whoami()


_access: dict = {}


def access_token() -> str:
    if _access.get("token") and _access["expires"] > time.time() + 60:
        return _access["token"]
    rt = env("YT_REFRESH_TOKEN")
    if not rt:
        sys.exit("YT_REFRESH_TOKEN missing in .env. Run:  python tools/youtube.py login")
    c = client()
    r = requests.post(c.get("token_uri", "https://oauth2.googleapis.com/token"), data={
        "client_id": c["client_id"],
        "client_secret": c.get("client_secret", ""),
        "refresh_token": rt,
        "grant_type": "refresh_token",
    }, timeout=30)
    if r.status_code == 400 and "invalid_grant" in r.text:
        sys.exit("The saved Google sign-in has expired or was revoked. Run:  python tools/youtube.py login\n"
                 "(While the Google Cloud app is in 'Testing', sign-ins expire after 7 days; setup guide step 3 fixes that.)")
    tok = check(r, "Google token refresh")
    _access.update(token=tok["access_token"], expires=time.time() + int(tok.get("expires_in", 3600)))
    return _access["token"]


def auth() -> dict:
    return {"Authorization": f"Bearer {access_token()}"}


def channel() -> dict:
    data = check(requests.get(f"{API}/channels", params={"part": "snippet,status", "mine": "true"}, headers=auth(), timeout=30))
    if not data.get("items"):
        sys.exit("This Google account has no YouTube channel. Sign in with the account that owns the channel (run login again).")
    return data["items"][0]


def whoami() -> None:
    ch = channel()
    sn = ch["snippet"]
    print(f"Connected. Channel: {sn['title']} ({sn.get('customUrl', '')}, id {ch['id']})")


# ---------- post ----------

def probe(video: Path) -> tuple[int, int, float]:
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration",
             "-of", "json", str(video)], capture_output=True, text=True, timeout=60).stdout
        d = json.loads(out)
        s = d["streams"][0]
        return int(s["width"]), int(s["height"]), float(d["format"]["duration"])
    except Exception:
        return 0, 0, 0.0


def clean(text: str) -> str:
    return text.replace("<", "").replace(">", "")  # YouTube rejects angle brackets in titles and descriptions


def build(caption: str, title: str | None) -> tuple[str, str, list[str]]:
    first = next((l.strip() for l in caption.splitlines() if l.strip()), "")
    t = clean(title or first).strip()
    if len(t) > 100:
        t = t[:99].rstrip() + "…"
    desc = clean(caption)
    tags = [w.lstrip("#") for w in re.findall(r"#\w+", caption)]
    return t, desc, tags


def upload(video: Path, body: dict) -> dict:
    size = video.stat().st_size
    r = requests.post(
        f"{UPLOAD_API}/videos",
        params={"uploadType": "resumable", "part": "snippet,status"},
        headers={**auth(), "Content-Type": "application/json; charset=UTF-8",
                 "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": str(size)},
        data=json.dumps(body), timeout=60)
    check(r, "YouTube upload start")
    session = r.headers["Location"]
    offset, fails, err = 0, 0, ""
    with video.open("rb") as f:
        while offset < size:
            f.seek(offset)
            chunk = f.read(CHUNK)
            end = offset + len(chunk) - 1
            try:
                r = requests.put(session, data=chunk, timeout=300, headers={
                    **auth(), "Content-Length": str(len(chunk)), "Content-Range": f"bytes {offset}-{end}/{size}"})
            except requests.RequestException as e:
                r, err = None, str(e)
            if r is not None and r.status_code in (200, 201):
                print(f"    uploaded {size / 1_048_576:.1f} / {size / 1_048_576:.1f} MB")
                return r.json()
            if r is not None and r.status_code == 308:
                rng = r.headers.get("Range")
                offset = int(rng.split("-")[1]) + 1 if rng else 0
                print(f"    uploaded {offset / 1_048_576:.1f} / {size / 1_048_576:.1f} MB")
                fails = 0
                continue
            if r is not None and r.status_code not in (500, 502, 503, 504):
                check(r, "YouTube upload")
            fails += 1
            if fails > TRIES:
                sys.exit(f"upload kept failing ({err if r is None else r.status_code}); nothing was published")
            wait = 2 ** fails
            print(f"    connection problem, retrying in {wait}s ({fails}/{TRIES})")
            time.sleep(wait)
            # ask YouTube how much it already has
            q = requests.put(session, headers={**auth(), "Content-Range": f"bytes */{size}"}, timeout=60)
            if q.status_code in (200, 201):
                return q.json()
            rng = q.headers.get("Range")
            offset = int(rng.split("-")[1]) + 1 if rng else 0
    sys.exit("upload ended without a reply from YouTube; check YouTube Studio before retrying")


def post(video: Path, caption: str, title: str | None, privacy: str, thumb: Path | None,
         synthetic: bool, category: str, confirm: bool) -> None:
    if not video.exists():
        sys.exit(f"video not found: {video}")
    if privacy not in ("public", "unlisted", "private"):
        sys.exit("--privacy must be public, unlisted or private")
    if thumb and not thumb.exists():
        sys.exit(f"thumbnail not found: {thumb}")
    t, desc, tags = build(caption, title)
    if not t:
        sys.exit("empty title; pass --title")
    if len(desc.encode("utf-8")) > 5000:
        sys.exit(f"description is {len(desc.encode('utf-8'))} bytes; YouTube allows 5000")
    if len(",".join(tags)) > 500:
        sys.exit("tags are longer than YouTube's 500-character limit")
    w, h, dur = probe(video)
    is_short = h > w > 0 and dur <= 180

    ch = channel() if (confirm or env("YT_REFRESH_TOKEN")) else None
    print(f"Channel : {ch['snippet']['title']}" if ch else "Channel : (not connected yet: run  python tools/youtube.py login)")
    print(f"Video   : {video.name} ({video.stat().st_size / 1_048_576:.1f} MB, {w}x{h}, {dur:.1f} s)")
    print(f"Format  : {'YouTube Short (vertical, 3 min or less)' if is_short else 'regular video (not vertical or over 3 min, so not a Short)'}")
    print(f"Privacy : {privacy}")
    print(f"Thumb   : {thumb.name if thumb else 'YouTube picks a frame'}")
    print(f"AI label: {'yes (altered or synthetic content)' if synthetic else 'no'}")
    print(f"Title   : {t}  ({len(t)}/100)")
    print(f"Tags    : {', '.join(tags) or '(none)'}")
    print(f"Description:\n---\n{desc}\n---")
    if re.search(r"\bDM\b", desc):
        print("NOTE: the description promises a DM. YouTube has no DMs or comment-to-DM automation;\n"
              "      consider a YouTube-specific caption (e.g. 'links in the pinned comment').")
    if not confirm:
        print("DRY RUN: nothing was uploaded. Add --yes to upload.")
        return

    body = {
        "snippet": {"title": t, "description": desc, "tags": tags, "categoryId": category},
        "status": {"privacyStatus": privacy, "selfDeclaredMadeForKids": False, "containsSyntheticMedia": synthetic},
    }
    print("1/3 uploading")
    vid = upload(video, body)
    video_id = vid["id"]
    got = vid.get("status", {}).get("privacyStatus", privacy)
    print(f"2/3 uploaded: https://www.youtube.com/shorts/{video_id}" if is_short else f"2/3 uploaded: https://youtu.be/{video_id}")
    if got != privacy:
        print(f"    NOTE: YouTube set it to '{got}', not '{privacy}'. Uploads from Google Cloud projects that haven't\n"
              "    passed the YouTube API audit are locked to private. Make it public in YouTube Studio (setup guide, 'Limits').")

    if thumb:
        r = requests.post(f"{UPLOAD_API}/thumbnails/set", params={"videoId": video_id},
                          headers={**auth(), "Content-Type": "image/png" if thumb.suffix.lower() == ".png" else "image/jpeg"},
                          data=thumb.read_bytes(), timeout=120)
        if r.ok:
            print("3/3 thumbnail set")
        else:
            print(f"3/3 thumbnail NOT set (HTTP {r.status_code}): {r.text[:200]}\n"
                  "    Custom thumbnails need a phone-verified channel (youtube.com/verify) and an image under 2 MB.")
    else:
        print("3/3 no custom thumbnail")

    LOG.parent.mkdir(exist_ok=True)
    with LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps({"video_id": video_id, "url": f"https://youtu.be/{video_id}", "privacy": got,
                            "video": video.name, "time": time.strftime("%Y-%m-%dT%H:%M:%S")}) + "\n")


def opt(args: list[str], name: str) -> str | None:
    return args[args.index(name) + 1] if name in args and args.index(name) + 1 < len(args) else None


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")  # captions contain emoji; Windows consoles default to cp1252
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    cmd = args[0]
    if cmd == "login":
        login()
    elif cmd == "whoami":
        whoami()
    elif cmd == "post" and len(args) >= 3:
        cap = Path(args[2]).read_text(encoding="utf-8").strip()
        th = opt(args, "--thumb")
        post(Path(args[1]), cap, opt(args, "--title"), opt(args, "--privacy") or "public",
             Path(th) if th else None, "--synthetic" in args, opt(args, "--category") or "28", "--yes" in args)
    else:
        sys.exit(__doc__)
