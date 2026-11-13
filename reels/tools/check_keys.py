"""Check that the API keys in .env are present and accepted. Never prints the keys themselves."""
import json
import urllib.error
import urllib.request
from pathlib import Path

ENV = Path(__file__).resolve().parent.parent / ".env"


def load_env() -> dict:
    env = {}
    if not ENV.exists():
        raise SystemExit(f"No keys file yet. Copy .env.example to {ENV} and fill in the keys.")
    for line in ENV.read_text(encoding="utf-8-sig").splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def request(url: str, headers: dict) -> tuple[int, str]:
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def describe(key: str) -> str:
    return f"present, {len(key)} chars" + (", has spaces!" if " " in key else "")


env = load_env()

fal = env.get("FAL_KEY", "")
print("FAL_KEY:", describe(fal) if fal else "MISSING")
if fal:
    # Status of a non-existent request: 401/403 means the key is rejected, anything else means it was accepted.
    code, _ = request(
        "https://queue.fal.run/fal-ai/fast-sdxl/requests/00000000-0000-0000-0000-000000000000/status",
        {"Authorization": f"Key {fal}"},
    )
    print("  fal.ai:", "REJECTED (check the key)" if code in (401, 403) else f"accepted (HTTP {code})")

el = env.get("ELEVENLABS_API_KEY", "")
print("ELEVENLABS_API_KEY:", describe(el) if el else "MISSING")
if el:
    code, body = request("https://api.elevenlabs.io/v1/user/subscription", {"xi-api-key": el})
    if code == 200:
        sub = json.loads(body)
        print(f"  ElevenLabs: accepted, plan={sub.get('tier')}, used {sub.get('character_count')} of {sub.get('character_limit')} credits")
    elif code == 401:
        detail = json.loads(body).get("detail", {}) if body.startswith("{") else {}
        status = detail.get("status") if isinstance(detail, dict) else None
        if status == "missing_permissions":
            print("  ElevenLabs: key accepted, but 'User: Read' permission is off (credit balance not visible)")
        else:
            print("  ElevenLabs: REJECTED (check the key)")
    else:
        print(f"  ElevenLabs: unexpected HTTP {code}")
