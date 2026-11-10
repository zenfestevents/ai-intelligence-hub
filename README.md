# AetherAI Intelligence Radar

AI news from free primary-source feeds. Each article is summarised by Gemini, which must also copy one sentence from the article word for word. Plain Python then checks that sentence really is in the article. If it is not, the item is thrown away.

What the check proves: the quote exists in the source. It does not prove the title and summary are accurate, so the dashboard links every item to its source.

## One-time setup

1. **Supabase**: create a free project. In Project Settings → Database → Connection string, copy the **Session pooler** string.
2. **Gemini**: create an API key in Google AI Studio.
3. Copy `backend/.env.example` to `backend/.env` and paste both values in.
4. **Node 20 or newer** is needed for the dashboard (Node 22 LTS recommended).

## Run the backend

From the `backend` folder:

```bash
.venv\Scripts\python.exe database.py
```

```bash
.venv\Scripts\python.exe -m uvicorn main:app --port 8000
```

The first command creates the tables in Supabase. The second starts the API and the background poller (each feed on its own interval, startups sync every 12 hours).

Other commands, also from `backend`:

| Command | What it does |
| --- | --- |
| `.venv\Scripts\python.exe check_feeds.py` | Shows which sources are reachable. Needs no keys. |
| `.venv\Scripts\python.exe worker.py` | One manual pass over all feeds. |
| `.venv\Scripts\python.exe worker.py "OpenAI"` | One manual pass over a single feed. |
| `.venv\Scripts\python.exe startups_sync.py` | Refreshes the startup directory. |
| `.venv\Scripts\python.exe -m pytest tests -q` | Tests for the quote verifier. |

## Run the dashboard

From the `frontend` folder, after upgrading Node:

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000. The dashboard forwards `/api/*` to the backend on port 8000.

## Sources

Edit `backend/feeds.py` to add, remove or disable a source. Three sources from the original spec are disabled because they have no working free feed: Anthropic (the public RSSHub blocks requests), Meta AI (no RSS), Qwen (the repo publishes no releases). Each entry carries a note explaining its state.

The startup directory comes from the public Y Combinator dataset at github.com/yc-oss/api, filtered to companies tagged Artificial Intelligence. It is mostly US companies.

## Skills

`.claude/skills/` holds the 18 skills copied from `zenfestevents/zenfestevents-webapp`. The dashboard follows `brutalist-skill` (the dark "tactical telemetry" mode).
