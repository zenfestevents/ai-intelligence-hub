"""Step 1 of the pipeline: fetch sources and queue new articles. Uses no LLM and needs no API key.

Claude works through the queue afterwards (see claude_queue.py).

Manual run:  python ingest.py            (all enabled feeds)
             python ingest.py "OpenAI"   (one feed by label)
"""
import logging
import sys
from typing import Optional

import config
from database import DBIntelFeed, DBPending, DBRejected, SessionLocal
from feeds import ENABLED_FEEDS, Feed
from sources import fetch_entries
from worker import entry_date, get_text

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("radar.ingest")

# Stop queueing when this many articles are already waiting for Claude.
MAX_PENDING = 300


def _seen(db, url: str) -> bool:
    return bool(
        db.query(DBIntelFeed.id).filter(DBIntelFeed.source_url == url).first()
        or db.query(DBRejected.id).filter(DBRejected.source_url == url).first()
        or db.query(DBPending.id).filter(DBPending.source_url == url).first()
    )


def ingest_feed(feed: Feed) -> int:
    """Queue new articles from one source. Returns how many were queued."""
    queued = 0
    logger.info(f"Scanning: {feed.label}")
    try:
        entries = fetch_entries(feed)
    except Exception as e:
        logger.error(f"Source unavailable: {feed.label}: {e}")
        return 0

    db = SessionLocal()
    try:
        for entry in entries[: feed.max_entries or config.ENTRIES_PER_FEED]:
            url = entry.get("link")
            if not url:
                continue
            try:
                if db.query(DBPending).count() >= MAX_PENDING:
                    logger.warning("Queue is full, stopping.")
                    return queued
                if _seen(db, url):
                    continue
                text = get_text(feed, entry)
                if len(text) < 200:
                    logger.info(f"Skipped (too little text): {url}")
                    continue
                db.add(
                    DBPending(
                        source_url=url,
                        source_label=feed.label[:100],
                        title=(entry.get("title") or "").strip(),
                        text=text,
                        published_at=entry_date(entry),
                    )
                )
                db.commit()
                queued += 1
                logger.info(f"Queued: {url}")
            except Exception as e:
                db.rollback()
                logger.error(f"Error on {url}: {e}")
    finally:
        db.close()
    return queued


def run(only: Optional[str] = None) -> int:
    total = 0
    for feed in ENABLED_FEEDS:
        if only and feed.label.lower() != only.lower():
            continue
        total += ingest_feed(feed)
    logger.info(f"Ingest done: {total} new articles queued")
    return total


if __name__ == "__main__":
    run(sys.argv[1] if len(sys.argv) > 1 else None)
