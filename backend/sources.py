"""Turns any source in the catalog into a list of feed-like entries.

Most sources are RSS/Atom. Two are JSON APIs and are converted here so the worker
can treat everything the same way: Hugging Face model lists and Hacker News (Algolia).
"""
import calendar
import datetime
import time
from typing import List

import feedparser
import httpx

import config
from feeds import Feed

HEADERS = {"User-Agent": config.USER_AGENT}


def _get(url: str) -> httpx.Response:
    r = httpx.get(url, headers=HEADERS, timeout=20, follow_redirects=True)
    r.raise_for_status()
    return r


def _iso_to_struct(value: str):
    """ISO timestamp -> time.struct_time in UTC (what feedparser entries carry)."""
    try:
        dt = datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
        return time.gmtime(calendar.timegm(dt.utctimetuple()))
    except Exception:
        return None


def _hf_models(feed: Feed) -> List[dict]:
    entries = []
    for m in _get(feed.url).json():
        model_id = m.get("id") or m.get("modelId")
        if not model_id:
            continue
        tags = ", ".join(t for t in m.get("tags", []) if ":" not in t)[:300]
        summary = (
            f"Model {model_id} on Hugging Face. Task: {m.get('pipeline_tag') or 'unknown'}. "
            f"Library: {m.get('library_name') or 'unknown'}. Downloads: {m.get('downloads', 0)}. "
            f"Likes: {m.get('likes', 0)}. Tags: {tags}."
        )
        entries.append(
            feedparser.FeedParserDict(
                link=f"https://huggingface.co/{model_id}",
                title=model_id,
                summary=summary,
                published_parsed=_iso_to_struct(m.get("lastModified") or m.get("createdAt") or ""),
            )
        )
    return entries


def _hacker_news(feed: Feed) -> List[dict]:
    entries = []
    for h in _get(feed.url).json().get("hits", []):
        if not h.get("url"):  # Ask HN / text posts have no external article
            continue
        entries.append(
            feedparser.FeedParserDict(
                link=h["url"],
                title=h.get("title", ""),
                summary="",
                published_parsed=_iso_to_struct(h.get("created_at") or ""),
            )
        )
    return entries


def fetch_entries(feed: Feed) -> list:
    """Downloads a source and returns its entries (newest first). Raises on network errors."""
    if feed.kind == "hf_models":
        return _hf_models(feed)
    if feed.kind == "hn":
        return _hacker_news(feed)
    return feedparser.parse(_get(feed.url).content).entries
