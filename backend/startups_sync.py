"""Fills startups_directory from the free public YC companies dataset (github.com/yc-oss/api).

No LLM is used: every field is copied from the dataset, and each row links to the
company's Y Combinator page as its source.

Usage: python startups_sync.py
"""
import logging

import httpx

import config
from database import DBStartup, SessionLocal

logger = logging.getLogger("radar.startups")

YC_AI_URL = "https://yc-oss.github.io/api/tags/artificial-intelligence.json"

_COUNTRY_ALIASES = {
    "United States of America": "United States",
    "USA": "United States",
    "UK": "United Kingdom",
}


def company_country(c: dict) -> str:
    regions = c.get("regions") or []
    # The dataset lists the country first, then broader regions ("America / Canada", "Remote").
    for r in regions:
        if "/" not in r and "Remote" not in r:
            return _COUNTRY_ALIASES.get(r, r)[:100]
    first_location = (c.get("all_locations") or "").split(";")[0]
    last_part = first_location.split(",")[-1].strip()
    if last_part:
        return _COUNTRY_ALIASES.get(last_part, last_part)[:100]
    return "Global"


def sync_startups() -> dict:
    r = httpx.get(YC_AI_URL, headers={"User-Agent": config.USER_AGENT}, timeout=60, follow_redirects=True)
    r.raise_for_status()
    companies = r.json()

    db = SessionLocal()
    added = updated = skipped = 0
    try:
        existing = {s.company_name: s for s in db.query(DBStartup).all()}
        for c in companies:
            name = (c.get("name") or "").strip()[:150]
            website = (c.get("website") or "").strip()
            description = (c.get("long_description") or c.get("one_liner") or "").strip()
            if not name or not website or not description or c.get("status") != "Active":
                skipped += 1
                continue
            fields = dict(
                website_url=website,
                country=company_country(c),
                industry=(c.get("industry") or "Unspecified")[:100],
                batch_or_funding=("YC " + c["batch"])[:100] if c.get("batch") else None,
                use_case_description=description,
                source_reference_url=c.get("url") or "https://www.ycombinator.com/companies",
            )
            row = existing.get(name)
            if row is None:
                row = DBStartup(company_name=name, **fields)
                db.add(row)
                existing[name] = row
                added += 1
            else:
                for k, v in fields.items():
                    setattr(row, k, v)
                updated += 1
        db.commit()
    finally:
        db.close()
    result = {"added": added, "updated": updated, "skipped": skipped}
    logger.info(f"Startups sync done: {result}")
    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
    print(sync_startups())
