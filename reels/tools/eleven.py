"""ElevenLabs helpers: clone a voice and generate speech. Reads the API key from .env; never prints it.

Usage:
  python eleven.py clone <name> <sample_audio> [more samples...]   -> saves voice id to work/voice.json
  python eleven.py say <text_or_@file> <out.mp3> [model_id]
  python eleven.py say_script <script.json> <out.mp3> <alignment_out.json> [model_id]
"""
import base64
import json
import sys
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
VOICE_FILE = ROOT / "work" / "voice.json"
API = "https://api.elevenlabs.io/v1"


def api_key() -> str:
    for line in (ROOT / ".env").read_text(encoding="utf-8-sig").splitlines():
        if line.startswith("ELEVENLABS_API_KEY="):
            return line.split("=", 1)[1].strip()
    sys.exit("ELEVENLABS_API_KEY missing in .env")


def check(r: requests.Response) -> requests.Response:
    if not r.ok:
        sys.exit(f"ElevenLabs error HTTP {r.status_code}: {r.text[:400]}")
    return r


def clone(name: str, samples: list[str]) -> None:
    files = [("files", (Path(s).name, open(s, "rb"))) for s in samples]
    r = check(
        requests.post(
            f"{API}/voices/add",
            headers={"xi-api-key": api_key()},
            data={"name": name, "remove_background_noise": "true", "description": "Owner's own voice, Tamil/English"},
            files=files,
            timeout=120,
        )
    )
    voice_id = r.json()["voice_id"]
    VOICE_FILE.parent.mkdir(exist_ok=True)
    VOICE_FILE.write_text(json.dumps({"voice_id": voice_id, "name": name}, indent=2), encoding="utf-8")
    print(f"cloned voice '{name}' -> {voice_id}")


def say(text: str, out: str, model: str = "eleven_multilingual_v2") -> None:
    if text.startswith("@"):
        text = Path(text[1:]).read_text(encoding="utf-8").strip()
    voice_id = json.loads(VOICE_FILE.read_text(encoding="utf-8"))["voice_id"]
    r = check(
        requests.post(
            f"{API}/text-to-speech/{voice_id}?output_format=mp3_44100_128",
            headers={"xi-api-key": api_key(), "Content-Type": "application/json"},
            json={
                "text": text,
                "model_id": model,
                "voice_settings": {"stability": 0.45, "similarity_boost": 0.85, "style": 0.2, "use_speaker_boost": True},
            },
            timeout=180,
        )
    )
    Path(out).write_bytes(r.content)
    print(f"wrote {out} ({len(r.content) // 1024} KB, {len(text)} chars)")


def say_script(script: str, out_mp3: str, out_alignment: str, model: str = "eleven_multilingual_v2") -> None:
    """Speak a reel script's segments as one take; save audio plus per-character timings."""
    spec = json.loads(Path(script).read_text(encoding="utf-8"))
    text = " ".join(s["text"] for s in spec["segments"])
    voice_id = json.loads(VOICE_FILE.read_text(encoding="utf-8"))["voice_id"]
    r = check(
        requests.post(
            f"{API}/text-to-speech/{voice_id}/with-timestamps?output_format=mp3_44100_128",
            headers={"xi-api-key": api_key(), "Content-Type": "application/json"},
            json={
                "text": text,
                "model_id": model,
                "voice_settings": {"stability": 0.45, "similarity_boost": 0.85, "style": 0.2, "use_speaker_boost": True},
            },
            timeout=300,
        )
    )
    data = r.json()
    Path(out_mp3).parent.mkdir(parents=True, exist_ok=True)
    Path(out_mp3).write_bytes(base64.b64decode(data["audio_base64"]))
    Path(out_alignment).write_text(json.dumps(data["alignment"], ensure_ascii=False), encoding="utf-8")
    print(f"wrote {out_mp3} and {out_alignment} ({len(text)} chars)")


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "clone":
        clone(sys.argv[2], sys.argv[3:])
    elif cmd == "say":
        say(sys.argv[2], sys.argv[3], *(sys.argv[4:5]))
    elif cmd == "say_script":
        say_script(sys.argv[2], sys.argv[3], sys.argv[4], *(sys.argv[5:6]))
    else:
        sys.exit(__doc__)
