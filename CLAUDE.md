# Rules for Claude in this project

## Daily run: every source, every item, no skipping

The user's standing instruction (16 Nov 2026):

- Every daily run covers **all** sources: every enabled feed in `backend/feeds.py` **and** the X accounts
  through Apify. Run `python daily_scan.py` from `backend/` **without** `--no-x`. Apify credit cost is approved.
- Never skip, sample, truncate or filter out a source or its items to save time, credit or effort.
  Missing an important detail is worse than a slow run.
- Wait for the run to finish, however long it takes (1, 2, 3 hours or more). Do not cut it short and do not
  pick posts from a partial run.
- If a source fails, retry it. If it still fails, or the run is taking much longer than expected, **tell the
  user and let them decide**. Do not decide on your own to skip it, shorten the window, or move on.
- Claude does not make decisions on the user's behalf: no skipping steps, changing scope, or choosing
  trade-offs (cost, time, coverage) without asking first. Report the options and wait for the user's answer.

## Posting

- Reels go to Instagram only after a dry run and the user's explicit yes (`reels/tools/instagram.py`).
- Every reel posted to Instagram also goes to YouTube at the same time (user's standing instruction, 17 Nov 2026),
  including scheduled posts: `reels/tools/youtube.py` with the same `_ig.mp4` and an `output/<reel>_caption_yt.txt`
  that puts the DM content (links, steps) in the description, since YouTube has no DMs. The Instagram yes covers both.
  Since 17 Nov 2026 the user's approval of the day's topics is that yes: build the reels, dry-run them, and post
  them without asking the user to review the videos.
- Daily target: 3 reels. Each reel gets a custom cover, set through the API (cover still prepended, `--thumb-ms 100`).
