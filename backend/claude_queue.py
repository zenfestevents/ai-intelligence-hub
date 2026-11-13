"""Step 2 of the pipeline: Claude summarises queued articles; Python checks the quote.

Claude (running as a scheduled task) does two things:

  python claude_queue.py next 15        -> prints up to 15 queued articles as JSON
  python claude_queue.py submit FILE    -> reads Claude's answers (JSON list) and saves them
  python claude_queue.py status         -> shows how many articles are waiting

Each answer must contain the fields of models.VerifiedIntelExtraction plus "source_url".
The quote check is the same plain-Python check as before: if the quote is not word for word
in the article, the item is thrown away and never reaches the site.
"""
import json
import sys
from typing import Any, Dict, List

from pydantic import ValidationError

import config
from database import DBIntelFeed, DBPending, DBRejected, SessionLocal
from feeds import KEEP_ALL_LABELS
from models import CATEGORIES, INDUSTRIES, VerifiedIntelExtraction
from verifier import verify_quote

# Claude only sees this many characters of each article (keeps a run inside the plan's limits).
CLAUDE_VIEW_CHARS = 6000
MAX_ATTEMPTS = 3


def next_batch(limit: int) -> List[Dict[str, Any]]:
    db = SessionLocal()
    try:
        rows = (
            db.query(DBPending)
            .filter(DBPending.attempts < MAX_ATTEMPTS)
            .order_by(DBPending.published_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "source_url": r.source_url,
                "source": r.source_label,
                "title": r.title,
                # True = publish even if not about AI (e.g. GitHub Trending): always write a full answer.
                "always_keep": r.source_label in KEEP_ALL_LABELS,
                "text": r.text[:CLAUDE_VIEW_CHARS],
            }
            for r in rows
        ]
    finally:
        db.close()


def process_one(db, item: Dict[str, Any]) -> str:
    """Handle one answer from Claude. Returns 'saved', 'rejected', 'not_relevant' or an error tag."""
    url = (item.get("source_url") or "").strip()
    pending = db.query(DBPending).filter(DBPending.source_url == url).first()
    if not pending:
        return "unknown_url"
    try:
        extracted = VerifiedIntelExtraction.model_validate(
            {k: v for k, v in item.items() if k != "source_url"}
        )
    except ValidationError:
        pending.attempts += 1
        db.commit()
        return "invalid_answer"

    if not extracted.is_relevant and pending.source_label not in KEEP_ALL_LABELS:
        db.add(DBRejected(source_url=url, reason="not_relevant"))
        db.delete(pending)
        db.commit()
        return "not_relevant"

    ok, reason = verify_quote(pending.text, extracted.exact_source_quote)
    if not ok:
        db.add(DBRejected(source_url=url, reason=reason, attempted_quote=extracted.exact_source_quote[:1000]))
        db.delete(pending)
        db.commit()
        return "rejected"

    db.add(
        DBIntelFeed(
            title=extracted.title[:255],
            entity_name=extracted.entity_name[:100],
            primary_category=extracted.primary_category,
            industry_tag=extracted.industry_tag,
            summary=extracted.summary,
            exact_source_quote=extracted.exact_source_quote.strip(),
            source_url=url,
            country_of_origin=(extracted.country_of_origin or "Global")[:100],
            published_at=pending.published_at,
        )
    )
    db.delete(pending)
    db.commit()
    return "saved"


def submit(items: List[Dict[str, Any]]) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    db = SessionLocal()
    try:
        for item in items:
            try:
                outcome = process_one(db, item)
            except Exception as e:  # keep going if one row fails (e.g. duplicate URL)
                db.rollback()
                outcome = f"error:{type(e).__name__}"
            counts[outcome] = counts.get(outcome, 0) + 1
    finally:
        db.close()
    return counts


def status() -> Dict[str, int]:
    db = SessionLocal()
    try:
        return {
            "waiting": db.query(DBPending).filter(DBPending.attempts < MAX_ATTEMPTS).count(),
            "stuck": db.query(DBPending).filter(DBPending.attempts >= MAX_ATTEMPTS).count(),
            "published": db.query(DBIntelFeed).count(),
        }
    finally:
        db.close()


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")  # Windows consoles default to a legacy code page
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "next":
        n = int(sys.argv[2]) if len(sys.argv) > 2 else 15
        print(
            json.dumps(
                {"categories": CATEGORIES, "industries": INDUSTRIES, "articles": next_batch(n)},
                ensure_ascii=False,
            )
        )
    elif cmd == "submit":
        path = sys.argv[2] if len(sys.argv) > 2 else None
        raw = open(path, encoding="utf-8").read() if path else sys.stdin.read()
        print(json.dumps(submit(json.loads(raw))))
    elif cmd == "status":
        print(json.dumps(status()))
    else:
        print(__doc__)
