"""Database engine and ORM tables."""
import datetime
import uuid

from sqlalchemy import Column, DateTime, Integer, String, Text, Uuid, create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

import config

if not config.DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Copy backend/.env.example to backend/.env and paste "
        "your Supabase 'Session pooler' connection string into it."
    )

engine = create_engine(config.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


class DBIntelFeed(Base):
    __tablename__ = "intel_feed"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    entity_name = Column(String(100), nullable=False)
    primary_category = Column(String(50), nullable=False, index=True)
    industry_tag = Column(String(50), nullable=False, index=True)
    summary = Column(Text, nullable=False)
    exact_source_quote = Column(Text, nullable=False)
    source_url = Column(Text, unique=True, nullable=False)
    country_of_origin = Column(String(100), default="Global")
    published_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class DBStartup(Base):
    __tablename__ = "startups_directory"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_name = Column(String(150), unique=True, nullable=False)
    website_url = Column(Text, nullable=False)
    country = Column(String(100), nullable=False, index=True)
    industry = Column(String(100), nullable=False, index=True)
    batch_or_funding = Column(String(100))
    use_case_description = Column(Text, nullable=False)
    source_reference_url = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class DBRejected(Base):
    """Items that failed quote verification. Kept so they are not sent to the LLM again."""
    __tablename__ = "rejected_items"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_url = Column(Text, unique=True, nullable=False)
    reason = Column(String(100), nullable=False)
    attempted_quote = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class DBPending(Base):
    """Articles fetched and cleaned but not yet summarised. Claude works through this queue."""
    __tablename__ = "pending_articles"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_url = Column(Text, unique=True, nullable=False)
    source_label = Column(String(100), nullable=False)
    title = Column(Text, nullable=False, default="")
    text = Column(Text, nullable=False)
    published_at = Column(DateTime(timezone=True), nullable=False, index=True)
    attempts = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=utcnow)


def init_db() -> None:
    """Create tables. On PostgreSQL this runs schema.sql; elsewhere it uses the ORM."""
    if engine.dialect.name == "postgresql":
        sql = (config.BASE_DIR / "schema.sql").read_text(encoding="utf-8")
        with engine.begin() as conn:
            conn.execute(text(sql))
    else:
        Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_db()
    print(f"Tables ready on {engine.dialect.name}.")
