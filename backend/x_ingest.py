"""Queues new posts from key AI people on X (Twitter), using an Apify scraper.

X has no free feed, so this runs the Apify actor "xquik/x-tweet-scraper" once per run
(one run for all accounts) and puts the new posts in the same queue as every other source.
Claude then summarises them and the quote check runs, exactly like articles.

Needs APIFY_TOKEN in backend/.env (or as a GitHub secret). Cost is per tweet fetched
(about $0.00015 each at the time of writing; this actor has no free-plan cap, unlike
apidojo/tweet-scraper which returns at most 10 posts per run on the free plan), so run it once or twice a day, not every 30 minutes.

Usage: python x_ingest.py             run for real
       python x_ingest.py --dry-run   show what would be sent, spend nothing
"""
import datetime
import logging
import os
import sys
from email.utils import parsedate_to_datetime

import httpx

import config
from database import DBIntelFeed, DBPending, DBRejected, SessionLocal
from feeds import X_HANDLES

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("radar.x")

ACTOR = "xquik~x-tweet-scraper"
RUN_URL = f"https://api.apify.com/v2/acts/{ACTOR}/run-sync-get-dataset-items"
TWEETS_PER_ACCOUNT = 20
# Posts shorter than this cannot hold a 40-character verbatim quote plus context.
MIN_TEXT_CHARS = 80


def build_input() -> dict:
    return {
        "twitterHandles": X_HANDLES,
        "maxItems": TWEETS_PER_ACCOUNT * len(X_HANDLES),
        "maxItemsPerTarget": TWEETS_PER_ACCOUNT,
    }


def _parse_date(value) -> datetime.datetime:
    try:
        return parsedate_to_datetime(value).astimezone(datetime.timezone.utc)
    except Exception:
        return datetime.datetime.now(datetime.timezone.utc)


def _seen(db, url: str) -> bool:
    return bool(
        db.query(DBIntelFeed.id).filter(DBIntelFeed.source_url == url).first()
        or db.query(DBRejected.id).filter(DBRejected.source_url == url).first()
        or db.query(DBPending.id).filter(DBPending.source_url == url).first()
    )


def fetch_posts() -> list:
    """One paid Apify run for all accounts. Returns original posts (no retweets or replies)
    as dicts: url, author, text, published_at. Writes nothing to the database."""
    token = os.getenv("APIFY_TOKEN", "").strip()
    if not token:
        raise RuntimeError("APIFY_TOKEN is not set in backend/.env")
    r = httpx.post(
        RUN_URL,
        headers={"Authorization": f"Bearer {token}"},
        json=build_input(),
        timeout=300,
    )
    r.raise_for_status()
    items = r.json()
    logger.info(f"Apify returned {len(items)} posts")
    posts = []
    for t in items:
        url = t.get("url") or t.get("twitterUrl")
        text = (t.get("text") or t.get("fullText") or "").strip()
        a = t.get("author") or {}
        author = a.get("username") or a.get("userName") or ""
        if not url or not author:
            continue
        if t.get("isRetweet") or t.get("isReply") or t.get("type") in ("retweet", "reply"):
            continue
        posts.append({"url": url, "author": author, "text": text, "published_at": _parse_date(t.get("createdAt"))})
    return posts


def run() -> int:
    queued = 0
    posts = fetch_posts()
    db = SessionLocal()
    try:
        for p in posts:
            url, author, text = p["url"], p["author"], p["text"]
            if len(text) < MIN_TEXT_CHARS or _seen(db, url):
                continue
            try:
                db.add(
                    DBPending(
                        source_url=url,
                        source_label=f"X @{author}"[:100],
                        title=f"@{author} on X",
                        text=f"@{author} wrote on X:\n\n{text}"[: config.MAX_ARTICLE_CHARS],
                        published_at=p["published_at"],
                    )
                )
                db.commit()
                queued += 1
            except Exception as e:
                db.rollback()
                logger.error(f"Error on {url}: {e}")
    finally:
        db.close()
    logger.info(f"X ingest done: {queued} posts queued")
    return queued


if __name__ == "__main__":
    if "--dry-run" in sys.argv:
        print(f"POST {RUN_URL}")
        print(build_input())
    else:
        run()
