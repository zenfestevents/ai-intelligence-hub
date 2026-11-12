# AetherAI Intelligence Radar

AI news from free primary-source feeds. Each article is summarised by Claude, which must also copy one sentence from the article word for word. Plain Python then checks that sentence really is in the article. If it is not, the item is thrown away.

What the check proves: the quote exists in the source. It does not prove the title and summary are accurate, so the dashboard links every item to its source.

## One-time setup

1. **Supabase**: create a free project. In Project Settings → Database → Connection string, copy the **Session pooler** string.
2. **Gemini**: create an API key in Google AI Studio.
3. Copy `backend/.env.example` to `backend/.env` and paste both values in.
4. **Node 20 or newer** is needed for the dashboard (Node 22 LTS recommended).

## How articles flow

1. `backend/ingest.py` (GitHub Actions, every 30 minutes, no AI key) fetches every source in `backend/feeds.py` and puts new articles in the `pending_articles` queue.
2. A scheduled Claude task (`radar-summarise-queue`, daily, runs inside the Claude desktop app on your Pro plan) reads the queue with `claude_queue.py next`, writes the summary and a verbatim quote, and hands them to `claude_queue.py submit`.
3. `submit` checks with plain Python that the quote is word for word in the article. Pass: published. Fail: thrown away.

`backend/worker.py` is the older all-in-one Gemini path. It still works if `GEMINI_API_KEY` is set, but is no longer used by the workflow.

## How it is hosted

| Part | Where | Notes |
| --- | --- | --- |
| Database | Supabase | Tables from `backend/schema.sql`. |
| Dashboard and `/api` routes | Vercel | The Next.js app in `frontend/`. Reads Supabase directly. Needs `DATABASE_URL`. |
| News poller | GitHub Actions | `.github/workflows/poll.yml` runs `backend/worker.py` every 30 minutes and the startup sync twice a day. Needs `DATABASE_URL` and `GEMINI_API_KEY` as repository secrets. |

### Deploy the dashboard to Vercel

1. In Vercel: Add New → Project → import this GitHub repository.
2. Set **Root Directory** to `frontend`.
3. Add an environment variable `DATABASE_URL` with the same value as in `backend/.env`.
4. Deploy.

### Turn on the poller

In the GitHub repository: Settings → Secrets and variables → Actions → New repository secret. Add `DATABASE_URL` and `GEMINI_API_KEY`. Then open the Actions tab, pick "Radar poller" and click "Run workflow" to test it.

## Run on your PC

Dashboard, from the `frontend` folder (needs `frontend/.env.local` containing the `DATABASE_URL` line):

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000.

Backend tools, from the `backend` folder:

| Command | What it does |
| --- | --- |
| `.venv\Scripts\python.exe database.py` | Creates the tables in Supabase. |
| `.venv\Scripts\python.exe check_feeds.py` | Shows which sources are reachable. Needs no keys. |
| `.venv\Scripts\python.exe worker.py` | One manual pass over all feeds. |
| `.venv\Scripts\python.exe worker.py "OpenAI"` | One manual pass over a single feed. |
| `.venv\Scripts\python.exe startups_sync.py` | Refreshes the startup directory. |
| `.venv\Scripts\python.exe -m pytest tests -q` | Tests for the quote verifier. |
| `.venv\Scripts\python.exe -m uvicorn main:app --port 8000` | Optional: the same API in Python with a built-in poller. Do not run it alongside the GitHub Actions poller. |

## Sources

Edit `backend/feeds.py` to add, remove or disable a source. Three sources from the original spec are disabled because they have no working free feed: Anthropic (the public RSSHub blocks requests), Meta AI (no RSS), Qwen (the repo publishes no releases). Each entry carries a note explaining its state.

The startup directory comes from the public Y Combinator dataset at github.com/yc-oss/api, filtered to companies tagged Artificial Intelligence. It is mostly US companies.

## Skills

`.claude/skills/` holds the 18 skills copied from `zenfestevents/zenfestevents-webapp`. The dashboard follows `brutalist-skill` (the dark "tactical telemetry" mode).
