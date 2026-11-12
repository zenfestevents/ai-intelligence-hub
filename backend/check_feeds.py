"""Reports which sources in the catalog are reachable and return entries. Needs no keys.

Usage: python check_feeds.py
"""
import httpx

from feeds import FEEDS
from sources import fetch_entries


def check(feed):
    try:
        entries = fetch_entries(feed)
    except httpx.HTTPStatusError as e:
        return str(e.response.status_code), 0, "", ""
    except Exception as e:  # network errors, TLS errors, timeouts
        return "ERR", 0, type(e).__name__, ""
    newest = ""
    if entries:
        e = entries[0]
        newest = (e.get("published") or e.get("updated") or "")[:25]
        if not newest and e.get("published_parsed"):
            newest = "%04d-%02d-%02d" % tuple(e["published_parsed"][:3])
    return "200", len(entries), "", newest


def main():
    print(f"{'SOURCE':<30}{'HTTP':<6}{'ENTRIES':<9}{'NEWEST':<27}NOTE")
    alive = 0
    for f in FEEDS:
        status, n, err, newest = check(f)
        ok = status == "200" and n > 0
        alive += ok
        note = "" if ok else (err or "no entries / blocked")
        if not f.enabled:
            note = (note + " (disabled in feeds.py)").strip()
        print(f"{f.label:<30}{status:<6}{n:<9}{newest:<27}{note}")
    print(f"\n{alive} of {len(FEEDS)} sources alive.")


if __name__ == "__main__":
    main()
