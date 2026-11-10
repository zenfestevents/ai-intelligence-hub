"""Reports which feeds in the catalog are reachable and parse. Needs no keys.

Usage: python check_feeds.py
"""
import feedparser
import httpx

import config
from feeds import FEEDS


def check(url: str):
    try:
        r = httpx.get(url, headers={"User-Agent": config.USER_AGENT}, timeout=20, follow_redirects=True)
    except Exception as e:  # network errors, TLS errors, timeouts
        return "ERR", 0, type(e).__name__, ""
    parsed = feedparser.parse(r.content)
    n = len(parsed.entries)
    newest = ""
    if n:
        e = parsed.entries[0]
        newest = (e.get("published") or e.get("updated") or "")[:25]
    return str(r.status_code), n, "", newest


def main():
    print(f"{'SOURCE':<20}{'HTTP':<6}{'ENTRIES':<9}{'NEWEST':<27}NOTE")
    alive = 0
    for f in FEEDS:
        status, n, err, newest = check(f.url)
        ok = status == "200" and n > 0
        alive += ok
        note = "" if ok else (err or "no entries / blocked")
        if not f.enabled:
            note = (note + " (disabled in feeds.py)").strip()
        print(f"{f.label:<20}{status:<6}{n:<9}{newest:<27}{note}")
    print(f"\n{alive} of {len(FEEDS)} sources alive.")


if __name__ == "__main__":
    main()
