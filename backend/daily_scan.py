"""Daily headline scan: every enabled source, nothing skipped silently.

Lists what each source published in the last 24 hours so the day's post can be picked
from all of it. Uses no LLM and writes nothing to the database, so it costs no Claude usage.

  python daily_scan.py            every feed plus the X accounts (X costs Apify credit)
  python daily_scan.py --no-x     feeds only, free
  python daily_scan.py --hours 48 look further back

Every source ends in one of three states, all written to the report:
  FRESH  has items inside the window
  QUIET  loaded fine, nothing new (the age of its newest item is shown)
  FAILED could not be loaded after three tries (the reason is shown)

The report goes to reels/work/headlines_YYYY-MM-DD.txt.
"""
import datetime
import logging
import sys
import time
from concurrent.futures import ThreadPoolExecutor

import httpx

import config
from feeds import ENABLED_FEEDS, RSSHUB_URL, X_HANDLES
from sources import fetch_entries
from worker import entry_date

TRIES = 3
OUT_DIR = config.BASE_DIR.parent / "reels" / "work"


def wake_rsshub() -> str:
    """The free Render server sleeps when idle; the first request can take a minute to wake it."""
    if not RSSHUB_URL:
        return "not configured"
    for attempt in range(TRIES):
        try:
            httpx.get(RSSHUB_URL + "/", timeout=150).raise_for_status()
            return "awake"
        except Exception as e:
            err = str(e)[:80]
            time.sleep(10)
    return f"did not wake: {err}"


def scan(feed, hours: float, now: datetime.datetime) -> dict:
    err = ""
    for attempt in range(TRIES):
        try:
            entries = fetch_entries(feed)
            break
        except Exception as e:
            err = str(e).splitlines()[0][:90]
            time.sleep(5 * (attempt + 1))
    else:
        return {"feed": feed, "state": "FAILED", "why": err, "items": []}

    items, newest = [], None
    for e in entries[:60]:
        title, link = (e.get("title") or "").strip()[:140], e.get("link")
        if not link:
            continue
        if not (e.get("published_parsed") or e.get("updated_parsed")):
            # Trending lists carry no dates: everything on the list is current by definition.
            if feed.keep_all:
                items.append((None, title, link))
            continue
        age = (now - entry_date(e)).total_seconds() / 3600
        newest = age if newest is None else min(newest, age)
        if -1 <= age <= hours:
            items.append((max(age, 0.0), title, link))
    return {"feed": feed, "state": "FRESH" if items else "QUIET", "newest": newest, "items": items, "total": len(entries)}


def scan_x(hours: float, now: datetime.datetime) -> dict:
    from x_ingest import fetch_posts

    try:
        posts = fetch_posts()
    except Exception as e:
        return {"state": "FAILED", "why": str(e).splitlines()[0][:90], "items": [], "authors": set()}
    items = []
    for p in posts:
        age = (now - p["published_at"]).total_seconds() / 3600
        if age <= hours:
            items.append((max(age, 0.0), f"@{p['author']}", " ".join(p["text"].split())[:220], p["url"]))
    return {"state": "OK", "items": sorted(items), "authors": {p["author"].lower() for p in posts}, "total": len(posts)}


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    logging.disable(logging.CRITICAL)
    hours = float(sys.argv[sys.argv.index("--hours") + 1]) if "--hours" in sys.argv else 24.0
    now = datetime.datetime.now(datetime.timezone.utc)

    rsshub_state = wake_rsshub()
    hub = [f for f in ENABLED_FEEDS if RSSHUB_URL and f.url.startswith(RSSHUB_URL)]
    rest = [f for f in ENABLED_FEEDS if f not in hub]
    with ThreadPoolExecutor(8) as pool:
        results = list(pool.map(lambda f: scan(f, hours, now), rest))
    # One at a time: the small RSSHub server times out when asked for several feeds at once.
    results += [scan(f, hours, now) for f in hub]

    fresh = [r for r in results if r["state"] == "FRESH"]
    quiet = [r for r in results if r["state"] == "QUIET"]
    failed = [r for r in results if r["state"] == "FAILED"]
    dated = sorted(
        (age, r["feed"].group, r["feed"].label, t, l) for r in fresh for age, t, l in r["items"] if age is not None
    )
    trending = [(r["feed"].label, t, l) for r in fresh for age, t, l in r["items"] if age is None]

    x = None if "--no-x" in sys.argv else scan_x(hours, now)

    out = [
        f"Headline scan {now:%Y-%m-%d %H:%M} UTC, last {hours:g} hours",
        f"Feeds: {len(results)} checked | {len(fresh)} fresh | {len(quiet)} quiet | {len(failed)} failed | "
        f"{len(dated)} dated headlines | {len(trending)} trending items | RSSHub: {rsshub_state}",
    ]
    if x is None:
        out.append("X accounts: skipped (--no-x)")
    elif x["state"] == "FAILED":
        out.append(f"X accounts: FAILED ({x['why']})")
    else:
        silent = [h for h in X_HANDLES if h.lower() not in x["authors"]]
        out.append(
            f"X accounts: {len(X_HANDLES)} asked | {x['total']} original posts returned | {len(x['items'])} in window"
            + (f" | returned nothing: {', '.join(silent)}" if silent else "")
        )

    out.append("\n== FAILED (not covered today) ==")
    out += [f"{r['feed'].label} | {r['why']}" for r in failed] or ["none"]

    out.append("\n== HEADLINES, newest first ==")
    out += [f"{age:4.1f}h | {g} | {lab} | {t} | {l}" for age, g, lab, t, l in dated]

    out.append("\n== TRENDING NOW (lists without dates) ==")
    out += [f"{lab} | {t} | {l}" for lab, t, l in trending] or ["none"]

    if x and x["state"] == "OK":
        out.append("\n== X POSTS, newest first ==")
        out += [f"{age:4.1f}h | {who} | {text} | {url}" for age, who, text, url in x["items"]] or ["none in window"]

    out.append("\n== QUIET (loaded, nothing new) ==")
    for r in sorted(quiet, key=lambda r: r["feed"].label):
        n = r["newest"]
        newest = "no dated items" if n is None else f"newest {n / 24:.1f} days old" if n >= 48 else f"newest {n:.0f}h old"
        out.append(f"{r['feed'].label} | {r['total']} items | {newest}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / f"headlines_{now:%Y-%m-%d}.txt"
    path.write_text("\n".join(out) + "\n", encoding="utf-8")
    print("\n".join(out[:3]))
    print(f"Report: {path}")


if __name__ == "__main__":
    main()
