"""Background polling. Started by main.py when the API starts.

Each feed runs on its own interval from feeds.py. Jobs run one at a time on a single
worker thread so calls to the LLM never overlap and the free-tier rate limit holds.
"""
import datetime
import logging

from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.schedulers.background import BackgroundScheduler

import config
from feeds import ENABLED_FEEDS, Feed
from startups_sync import sync_startups
from worker import QuotaExhausted, process_feed

logger = logging.getLogger("radar.scheduler")

state = {"last_poll_at": None}


def _poll(feed: Feed) -> None:
    try:
        process_feed(feed)
    except QuotaExhausted as e:
        logger.warning(f"Gemini rate limit reached on {feed.label}; will retry next interval. {e}")
    finally:
        state["last_poll_at"] = datetime.datetime.now(datetime.timezone.utc)


def _sync_startups() -> None:
    try:
        sync_startups()
    except Exception as e:
        logger.error(f"Startups sync failed: {e}")


def start_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler(
        executors={"default": ThreadPoolExecutor(1)},
        job_defaults={"coalesce": True, "max_instances": 1, "misfire_grace_time": 3600},
        timezone="UTC",
    )
    now = datetime.datetime.now(datetime.timezone.utc)

    scheduler.add_job(_sync_startups, "interval", hours=12, next_run_time=now, id="startups")

    if config.GEMINI_API_KEY:
        for i, feed in enumerate(ENABLED_FEEDS):
            scheduler.add_job(
                _poll,
                "interval",
                minutes=feed.interval_min,
                args=[feed],
                id=f"feed:{feed.label}",
                next_run_time=now + datetime.timedelta(seconds=5 + i),
            )
    else:
        logger.warning("GEMINI_API_KEY is not set: feed polling is off, only the startups sync runs.")

    scheduler.start()
    logger.info(f"Scheduler started with {len(scheduler.get_jobs())} jobs.")
    return scheduler
