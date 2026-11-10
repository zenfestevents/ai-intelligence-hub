"""Web API. Run from the backend folder:  uvicorn main:app --reload --port 8000"""
import datetime
import logging
import uuid
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import Depends, FastAPI, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func
from sqlalchemy.orm import Session

import config
from database import DBIntelFeed, DBRejected, DBStartup, SessionLocal, init_db
from feeds import ENABLED_FEEDS
from models import CATEGORIES, INDUSTRIES

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    scheduler = None
    if config.ENABLE_SCHEDULER:
        from scheduler import start_scheduler

        scheduler = start_scheduler()
    yield
    if scheduler:
        scheduler.shutdown(wait=False)


app = FastAPI(title="AetherAI Intelligence Radar API", lifespan=lifespan)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class IntelResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    entity_name: str
    primary_category: str
    industry_tag: str
    summary: str
    exact_source_quote: str
    source_url: str
    country_of_origin: Optional[str]
    published_at: datetime.datetime


class StartupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company_name: str
    website_url: str
    country: str
    industry: str
    batch_or_funding: Optional[str]
    use_case_description: str
    source_reference_url: str


@app.get("/api/intel", response_model=List[IntelResponse])
def get_intel_feed(
    category: Optional[str] = None,
    industry: Optional[str] = None,
    country: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(DBIntelFeed)
    if category and category != "All":
        query = query.filter(DBIntelFeed.primary_category == category)
    if industry and industry != "All":
        query = query.filter(DBIntelFeed.industry_tag == industry)
    if country and country != "All":
        query = query.filter(DBIntelFeed.country_of_origin == country)
    return query.order_by(DBIntelFeed.published_at.desc()).limit(limit).all()


@app.get("/api/startups", response_model=List[StartupResponse])
def get_startups(
    country: Optional[str] = None,
    industry: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = Query(60, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(DBStartup)
    if country and country != "All":
        query = query.filter(DBStartup.country == country)
    if industry and industry != "All":
        query = query.filter(DBStartup.industry == industry)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(DBStartup.company_name.ilike(like) | DBStartup.use_case_description.ilike(like))
    return query.order_by(DBStartup.company_name).offset(offset).limit(limit).all()


@app.get("/api/startups/facets")
def get_startup_facets(db: Session = Depends(get_db)):
    """Filter options for the startups tab, most common first."""

    def counts(column):
        rows = db.query(column, func.count()).group_by(column).order_by(func.count().desc()).all()
        return [{"value": v, "count": n} for v, n in rows]

    return {"countries": counts(DBStartup.country), "industries": counts(DBStartup.industry)}


@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    now = datetime.datetime.now(datetime.timezone.utc)
    last_poll = None
    if config.ENABLE_SCHEDULER:
        from scheduler import state

        last_poll = state["last_poll_at"]
    return {
        "verified_last_24h": db.query(func.count(DBIntelFeed.id))
        .filter(DBIntelFeed.created_at >= now - datetime.timedelta(hours=24))
        .scalar(),
        "verified_total": db.query(func.count(DBIntelFeed.id)).scalar(),
        "rejected_total": db.query(func.count(DBRejected.id)).scalar(),
        "startups_total": db.query(func.count(DBStartup.id)).scalar(),
        "sources_enabled": len(ENABLED_FEEDS),
        "last_poll_at": last_poll,
        "polling_active": bool(config.ENABLE_SCHEDULER and config.GEMINI_API_KEY),
        "categories": list(CATEGORIES),
        "industries": list(INDUSTRIES),
    }
