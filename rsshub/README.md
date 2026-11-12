# Self-hosted RSSHub

**What it is:** RSSHub turns websites that have no RSS feed into feeds. The public one (rsshub.app) is
blocked by many sites, so we run our own copy. It is only used for the sources marked
"RSSHub" in `backend/feeds.py` (Anthropic news, 36Kr, GitHub Trending).

**X/Twitter is not served by this.** RSSHub's X route needs a logged-in X account cookie, which
breaks the rules of X and risks the account. X is read through Apify instead (`backend/x_ingest.py`).

## Deploy on Render (free)

1. Create a free account at render.com and connect your GitHub.
2. New > Blueprint > pick this repository. Render reads `rsshub/render.yaml`.
3. When it is live, copy the address (for example `https://zenfest-rsshub.onrender.com`).
4. Put it in `backend/.env` as `RSSHUB_URL=https://...` (no trailing slash) and add it as a
   repository secret/variable named `RSSHUB_URL` if GitHub Actions should use it.
5. Test: `python check_feeds.py` should now show the three RSSHub sources as alive.

## Limits to know

- The free Render plan sleeps after 15 minutes without a request, so the first request of a run can
  take about a minute. Our 30-minute polling wakes it, which is fine.
- The free plan has little memory (512 MB). RSSHub for a few routes fits; if it crashes, upgrade
  the plan or tell Claude and we will move it elsewhere.
- Some RSSHub routes need their own keys (GitHub routes work better with a `GITHUB_ACCESS_TOKEN`).
  Add them as environment variables in the Render dashboard, never in this repository.
