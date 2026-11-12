"""Tests a candidate source: finds a working feed for a website, or checks a feed address.

Usage: python probe_source.py https://example.com/blog
       python probe_source.py https://example.com/feed.xml

Prints one JSON object: whether a feed was found, its address, how many entries it has and
how recent the newest one is. Used by the source-discovery task; it changes nothing.
"""
import json
import re
import sys
import time
from urllib.parse import urljoin

import feedparser
import httpx

import config

COMMON_PATHS = ["feed", "feed/", "rss", "rss.xml", "feed.xml", "atom.xml", "index.xml", "blog/feed", "blog/rss.xml", "news/rss.xml"]
LINK_TAG = re.compile(r"<link[^>]+type=[\"']application/(?:rss|atom)\+xml[\"'][^>]*>", re.I)
HREF = re.compile(r"href=[\"']([^\"']+)[\"']", re.I)


def _get(url: str):
    return httpx.get(url, headers={"User-Agent": config.USER_AGENT}, timeout=20, follow_redirects=True)


def _try_feed(url: str):
    try:
        r = _get(url)
    except Exception:
        return None
    if r.status_code != 200:
        return None
    parsed = feedparser.parse(r.content)
    if not parsed.entries:
        return None
    newest = None
    for e in parsed.entries:
        t = e.get("published_parsed") or e.get("updated_parsed")
        if t and (newest is None or t > newest):
            newest = t
    age_days = None
    if newest:
        import calendar

        age_days = round((time.time() - calendar.timegm(newest)) / 86400, 1)
    return {"feed_url": str(r.url), "entries": len(parsed.entries), "newest_age_days": age_days}


def probe(url: str) -> dict:
    found = _try_feed(url)
    if found:
        return {"found": True, "how": "direct", **found}
    try:
        r = _get(url)
        html = r.text if r.status_code == 200 else ""
    except Exception:
        html = ""
    candidates = []
    for tag in LINK_TAG.findall(html):
        m = HREF.search(tag)
        if m:
            candidates.append(urljoin(url, m.group(1)))
    base = url.rstrip("/") + "/"
    candidates += [urljoin(base, p) for p in COMMON_PATHS]
    for c in dict.fromkeys(candidates):
        found = _try_feed(c)
        if found:
            return {"found": True, "how": "discovered", **found}
    return {"found": False, "note": "No RSS/Atom feed found. Consider a JSON API or a self-hosted RSSHub route."}


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(probe(sys.argv[1]), ensure_ascii=False))
