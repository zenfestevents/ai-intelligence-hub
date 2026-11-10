"""Settings loaded from backend/.env (see .env.example)."""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _database_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    # SQLAlchemy only accepts the "postgresql://" spelling.
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    # Newer SQLAlchemy defaults to the psycopg 3 driver; this project installs psycopg2.
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg2://" + url[len("postgresql://"):]
    return url


DATABASE_URL = _database_url()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash").strip()
LLM_DELAY_SECONDS = float(os.getenv("LLM_DELAY_SECONDS", "7"))
ENABLE_SCHEDULER = os.getenv("ENABLE_SCHEDULER", "1").strip() not in ("0", "false", "False", "")

# The LLM and the verifier both work on exactly this many characters of an article.
MAX_ARTICLE_CHARS = 12000
# Newest entries looked at per feed per cycle.
ENTRIES_PER_FEED = 5
USER_AGENT = "Mozilla/5.0 (compatible; IntelRadarBot/1.0; RSS reader)"
