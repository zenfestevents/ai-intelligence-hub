"""Writes the source list (feeds.py + X accounts) to frontend/lib/sources.json for the dashboard's Sources tab.

Run after changing feeds.py, then redeploy the frontend:
  python export_sources.py
"""
import json
from urllib.parse import urlparse

from feeds import FEEDS, RSSHUB_URL, X_HANDLES

OUT = __import__("pathlib").Path(__file__).resolve().parent.parent / "frontend" / "lib" / "sources.json"


def link_for(url: str) -> str:
    # RSSHub feeds point at the self-hosted RSSHub address, which stays private.
    if RSSHUB_URL and url.startswith(RSSHUB_URL):
        return ""
    return url


def main() -> None:
    sources = []
    for f in FEEDS:
        link = link_for(f.url)
        sources.append(
            {
                "label": f.label,
                "group": f.group,
                "enabled": f.enabled,
                "url": link,
                "host": urlparse(link).hostname.removeprefix("www.") if link else "via RSSHub",
                "every_min": f.interval_min,
                "keep_all": f.keep_all,
                "note": f.note,
            }
        )
    for h in X_HANDLES:
        sources.append(
            {
                "label": f"X @{h}",
                "group": "X accounts",
                "enabled": True,
                "url": f"https://x.com/{h}",
                "host": "x.com",
                "every_min": 1440,
                "keep_all": False,
                "note": "Read through Apify (paid per post).",
            }
        )
    OUT.write_text(json.dumps(sources, ensure_ascii=False, indent=1), encoding="utf-8")
    on = sum(s["enabled"] for s in sources if s["group"] != "X accounts")
    print(f"Wrote {OUT}: {on} feeds on, {len(FEEDS) - on} off, {len(X_HANDLES)} X accounts.")


if __name__ == "__main__":
    main()
