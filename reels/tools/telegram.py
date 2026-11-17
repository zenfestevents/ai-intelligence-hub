"""Telegram bot helper for the nightly autopilot: send messages, ask with buttons, wait for the owner's reply.

Reads TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID from the environment, else from reels/.env. Never prints the token.
Only messages from TELEGRAM_CHAT_ID are accepted; anything else sent to the bot is ignored.

Usage:
  python telegram.py chatid                          -> lists chats that messaged the bot (for first setup)
  python telegram.py send "<text>" [--file f.txt]    -> sends a message (text, or the contents of f.txt)
  python telegram.py ask "<text>" --buttons "A|B|C"  -> sends a message with buttons, prints its message id
  python telegram.py wait [--minutes 9]              -> waits for the owner's next reply (button press or text),
                                                        prints it as JSON; exits with code 2 on timeout
  python telegram.py video <file.mp4> "<caption>"    -> sends a video (max 50 MB)
  python telegram.py photo <file.png> "<caption>"    -> sends a photo

`ask` first marks every older update as read, so `wait` only returns answers given after the question.
The read position is kept in work/telegram_state.json, so several `wait` calls in a row never lose a reply.
"""
import json
import os
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
ENV = ROOT / ".env"
STATE = ROOT / "work" / "telegram_state.json"


def env(name: str) -> str:
    if os.environ.get(name, "").strip():
        return os.environ[name].strip()
    if ENV.exists():
        for line in ENV.read_text(encoding="utf-8-sig").splitlines():
            if line.startswith(f"{name}="):
                return line.split("=", 1)[1].strip()
    return ""


def api(method: str, timeout: int = 60, files=None, **params):
    token = env("TELEGRAM_BOT_TOKEN")
    if not token:
        sys.exit("TELEGRAM_BOT_TOKEN missing (environment or reels/.env)")
    url = f"https://api.telegram.org/bot{token}/{method}"
    for attempt in range(3):
        try:
            r = requests.post(url, data=params, files=files, timeout=timeout)
            data = r.json()
            if data.get("ok"):
                return data["result"]
            sys.exit(f"Telegram {method} failed: {data.get('description')}")
        except requests.RequestException as e:
            if attempt == 2:
                sys.exit(f"Telegram {method} failed after 3 tries: {type(e).__name__}")
            time.sleep(5)


def chat_id() -> str:
    c = env("TELEGRAM_CHAT_ID")
    if not c:
        sys.exit("TELEGRAM_CHAT_ID missing. Send /start to the bot, run `telegram.py chatid`, and save the number.")
    return c


def offset() -> int:
    if STATE.exists():
        return json.loads(STATE.read_text(encoding="utf-8")).get("offset", 0)
    return 0


def save_offset(o: int) -> None:
    STATE.parent.mkdir(exist_ok=True)
    STATE.write_text(json.dumps({"offset": o}), encoding="utf-8")


def mark_all_read() -> None:
    ups = api("getUpdates", offset=-1, timeout=30)
    if ups:
        save_offset(ups[-1]["update_id"] + 1)
        api("getUpdates", offset=ups[-1]["update_id"] + 1, timeout=30)


def send(text: str, buttons: list[str] | None = None) -> int:
    params = {"chat_id": chat_id(), "text": text[:4096], "disable_web_page_preview": "true"}
    if buttons:
        rows = [[{"text": b, "callback_data": b[:60]}] for b in buttons]
        params["reply_markup"] = json.dumps({"inline_keyboard": rows})
    return api("sendMessage", **params)["message_id"]


def wait(minutes: float) -> dict | None:
    """The owner's next reply as {"kind": "button"|"text", "value": ...}, or None after `minutes`."""
    me = chat_id()
    end = time.time() + minutes * 60
    while time.time() < end:
        poll = int(max(1, min(50, end - time.time())))
        for u in _long_poll(poll):
            save_offset(u["update_id"] + 1)
            if "callback_query" in u:
                q = u["callback_query"]
                if str(q["message"]["chat"]["id"]) != me:
                    continue
                api("answerCallbackQuery", callback_query_id=q["id"], text="Got it")
                return {"kind": "button", "value": q["data"]}
            m = u.get("message")
            if m and str(m["chat"]["id"]) == me and m.get("text"):
                return {"kind": "text", "value": m["text"]}
    return None


def _long_poll(seconds: int) -> list:
    token = env("TELEGRAM_BOT_TOKEN")
    try:
        r = requests.get(
            f"https://api.telegram.org/bot{token}/getUpdates",
            params={"offset": offset(), "timeout": seconds, "allowed_updates": json.dumps(["message", "callback_query"])},
            timeout=seconds + 20,
        )
        data = r.json()
        return data.get("result", []) if data.get("ok") else []
    except requests.RequestException:
        time.sleep(5)
        return []


def send_file(kind: str, path: str, caption: str) -> None:
    method, field = ("sendVideo", "video") if kind == "video" else ("sendPhoto", "photo")
    with open(path, "rb") as f:
        api(method, timeout=300, files={field: f}, chat_id=chat_id(), caption=caption[:1024])


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    cmd = a[0]
    if cmd == "chatid":
        for u in api("getUpdates", timeout=30):
            m = u.get("message") or u.get("callback_query", {}).get("message") or {}
            c = m.get("chat", {})
            if c:
                print(f"chat id {c.get('id')}  ({c.get('type')}, {c.get('first_name') or c.get('title') or ''})")
    elif cmd == "send":
        text = Path(a[a.index("--file") + 1]).read_text(encoding="utf-8") if "--file" in a else a[1]
        print(send(text))
    elif cmd == "ask":
        buttons = a[a.index("--buttons") + 1].split("|") if "--buttons" in a else None
        text = Path(a[a.index("--file") + 1]).read_text(encoding="utf-8") if "--file" in a else a[1]
        mark_all_read()
        print(send(text, buttons))
    elif cmd == "wait":
        minutes = float(a[a.index("--minutes") + 1]) if "--minutes" in a else 9
        got = wait(minutes)
        if got is None:
            print(json.dumps({"kind": "timeout"}))
            sys.exit(2)
        print(json.dumps(got, ensure_ascii=False))
    elif cmd in ("video", "photo"):
        send_file(cmd, a[1], a[2] if len(a) > 2 else "")
        print("sent")
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
