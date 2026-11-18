# Nightly autopilot for @ai.plainenglish

The cloud routine starts at **11:00 PM IST** and follows this file from top to bottom. The owner is only
reachable on **Telegram** (`reels/tools/telegram.py`). Everything the owner must decide goes there. Never decide
on the owner's behalf: if something is unclear or broken, ask on Telegram and wait.

Target: **3 reels a night, each posted to Instagram as soon as it is ready.**

## 0. Setup (about 3 minutes)

```bash
cd backend && python -m pip install -q -r requirements.txt && cd ..
python -m pip install -q requests
cd reels/remotion && npm ci --no-audit --no-fund && cd ../..
command -v ffmpeg || (sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg)
```

All keys come from environment variables (never print them): `APIFY_TOKEN`, `RSSHUB_URL`, `ELEVENLABS_API_KEY`,
`ELEVENLABS_VOICE_ID`, `IG_ACCESS_TOKEN`, `IG_USER_ID`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`,
`YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN`.
If one is missing, send what is missing to Telegram (if Telegram works) and stop.

Then check the Instagram token: `python reels/tools/instagram.py whoami`. If it fails, send on Telegram:
"Instagram token stopped working. Generate a new one (reels/tools/INSTAGRAM_SETUP.md) and update IG_ACCESS_TOKEN
in the cloud environment." Then stop: nothing can be posted tonight.

Check YouTube the same way: `python reels/tools/youtube.py whoami`. If it fails, send on Telegram:
"YouTube sign-in stopped working. Run `tools\youtube.py login` on your computer and update YT_REFRESH_TOKEN
in the cloud environment." Instagram posting can still go ahead tonight; skip only the YouTube uploads.

Send `🌙 Nightly run started. Scanning all sources…` to Telegram.

## 1. Full scan: every source, nothing skipped

```bash
cd backend && python daily_scan.py
```

Run it **without** `--no-x`: the X accounts through Apify are part of every run (credit cost is approved).
Wait for it to finish. The report is `reels/work/headlines_YYYY-MM-DD.txt`.

Every source listed under `== FAILED` must be retried:
1. Retry it with the script (wait 30 s between tries, see how `daily_scan.scan` is called).
2. If the feed still fails (for example HTTP 429), fetch the source's web page with WebFetch and read the
   last 24 hours from it.
3. If it still can't be read, ask on Telegram and wait for the answer:
   `python reels/tools/telegram.py ask "⚠️ <source> failed 3 ways: <reason>. What should I do?" --buttons "Retry again|Continue without it|Stop tonight"`

## 2. Pick 3 topics and get the owner's OK

1. Read the whole report (all headlines, trending lists and X posts). Leave out finance-only, non-AI news.
2. Check what was already posted: `python reels/tools/instagram.py recent 30`. Never repeat a topic.
3. Rank for this audience (Indian, non-technical, plain English): free tools people can try today first,
   then India-relevant news, then one big "wow" or news story. Pick **3 topics plus 3 backups**.
4. Open each source page and check every fact you will use (WebFetch). Note the facts and source URLs.
5. Send the topics:
   ```bash
   python reels/tools/telegram.py ask --file reels/work/topics.txt --buttons "✅ Approve all 3|🔁 Swap #1|🔁 Swap #2|🔁 Swap #3"
   ```
   `topics.txt`: for each topic a short title, one line on why it works, and the source site. Then list the
   3 backups as B1-B3. Keep it short enough to read on a phone.
6. Wait for the answer: `python reels/tools/telegram.py wait --minutes 9`. Exit code 2 means no answer yet:
   call it again. The owner may press a button or type ("change 2 to B1", "use B3 instead of 3", "ok").
   - **Swap #n**: send 3 more options for that slot with buttons (`Use B1|Use B2|Use B3|Show other options`),
     wait, then send the updated 3 topics and ask again.
   - Anything unclear: ask a short follow-up question on Telegram.
7. **No answer by 1:00 AM IST**: send `No answer, so nothing is posted tonight. Reply anytime to restart.` and stop.
   (The owner's rule: no posting without their OK.)

Once the owner approves, reply `👍 Making the 3 reels now. Each one goes live as soon as it's ready.`
The owner's approval of the topics is the yes to post. Do not ask them to review the videos.

## 3. Build each reel, then post it right away

Work through the 3 topics one by one (finish and post #1 before starting #2).

For each reel (`<id>` = short name like `jio`, `maps`):
1. Write `reels/work/<id>/script.json` (6 segments, about 25-35 seconds, plain spoken English, a hook in the
   first line, a call to action at the end; for a free tool or link use a comment word, e.g. "Comment TRIP").
   Same format as the existing scripts; use `display_replace` for spoken forms like "2 terabytes" -> "2 TB".
2. Voiceover in the owner's cloned voice:
   `python reels/tools/eleven.py say_script reels/work/<id>/script.json reels/remotion/public/vo/<id>/vo.mp3 reels/work/<id>/alignment.json`
3. Timeline: `python reels/tools/build_alignment_timeline.py reels/work/<id>/script.json reels/remotion/src/reels/<id>-timing.json reels/work/<id>/alignment.json`
4. Write the Remotion reel `reels/remotion/src/reels/<id>/<Name>.tsx` with a matching `<Name>Cover`, using the
   helpers in `reels/remotion/src/reels/common.tsx` (`makeTimeline`, `EndCard`, `Sfx`, `usePop`, `ease`), and
   add both to `reels/remotion/src/Root.tsx`. Use `jio/JioAiPro.tsx`, `maps/MapsTrip.tsx` and
   `abyss/AbyssWorld.tsx` as examples. Follow the design rules below.
5. Render 6-8 stills across the reel plus the cover (`npx remotion still ...`), look at every one, and fix any
   problem from the checklist below before rendering the video.
6. Render: `npx remotion render src/index.ts <Name> ../output/<id>_v1.mp4` (from `reels/remotion`).
7. Instagram copy with the cover as the first 0.2 s (this is how the custom cover is set through the API):
   ```bash
   cd reels/output && ffmpeg -y -loglevel error -loop 1 -framerate 30 -t 0.2 -i <id>_cover.png -f lavfi -t 0.2 -i anullsrc=r=44100:cl=stereo -i <id>_v1.mp4 -filter_complex "[0:v]format=yuv420p,setsar=1[cv];[2:v]format=yuv420p,setsar=1[mv];[cv][1:a][mv][2:a]concat=n=2:v=1:a=1[v][a]" -map "[v]" -map "[a]" -c:v libx264 -crf 20 -preset medium -c:a aac -b:a 160k -movflags +faststart <id>_v1_ig.mp4
   ```
8. Caption in `reels/output/<id>_caption.txt`: hook line with one emoji, 3-4 bullet facts, the call to
   action, "Follow for daily AI updates.", then **at most 5 hashtags**. Under 2,200 characters.
9. Dry run, then post:
   ```bash
   python reels/tools/instagram.py post reels/output/<id>_v1_ig.mp4 reels/output/<id>_caption.txt --thumb-ms 100
   python reels/tools/instagram.py post reels/output/<id>_v1_ig.mp4 reels/output/<id>_caption.txt --thumb-ms 100 --yes
   ```
   The tool retries flaky uploads itself. If it still fails, ask on Telegram (`Retry|Skip this reel|Stop`).
10. Same video to YouTube (owner's rule: every Instagram post also goes to YouTube). Write
    `reels/output/<id>_caption_yt.txt`: the Instagram caption with the comment-word / DM line replaced by the
    DM content itself (links, steps, prompts), since YouTube has no DMs, and "Subscribe for daily AI updates in
    plain English." instead of "Follow...". Then:
    ```bash
    python reels/tools/youtube.py post reels/output/<id>_v1_ig.mp4 reels/output/<id>_caption_yt.txt --thumb reels/output/<id>_cover.png
    python reels/tools/youtube.py post reels/output/<id>_v1_ig.mp4 reels/output/<id>_caption_yt.txt --thumb reels/output/<id>_cover.png --yes
    ```
    The dry run must show no DM note. If the upload fails, say so in the Telegram message; don't retry more than once.
11. Send to Telegram: `✅ Reel n/3 is live: <Instagram link> · YouTube: <link>`. If the reel has a comment word, also send the DM text the
    owner should reply with (the link or the tips), so they can copy it.

## 4. Wrap up

Send one Telegram summary: start and end time, scan result (feeds fresh/quiet/failed, X posts), the 3 links,
anything that went wrong. Then stop. Do not keep the session running.

## Design rules (from the owner)

- Brand: yellow `#FFD400` on near-black (`themes/aitools.ts`), Anton headlines, Inter body. Brand names of
  other companies as plain text only: no logos, no copies of their apps' screens.
- **Every reel looks different from the others.** Pick tonight's 3 styles from this list by taking the night's
  day-of-year number `d` and using styles `(d) % 12`, `(d + 4) % 12`, `(d + 8) % 12`; adapt the style to the topic:
  0 paper tickets + rubber stamps · 1 drawn route map + pins · 2 underwater / particles · 3 phone demo with camera
  moves · 4 panel cards + diagonal wipes · 5 3D dot clouds · 6 newspaper front page + headlines that print in ·
  7 retro terminal / code typing · 8 big kinetic numbers + bar charts · 9 sticky notes on a corkboard ·
  10 split-screen before/after · 11 chat conversation bubbles.
  Captions must also change style between reels (pill, plate, flip, rising words, etc.).
- Cover: 1080x1920, but the profile grid shows only the middle 1080x1440 (y 240-1680). Headline and key visual
  must sit inside it. Big, readable, 2-6 words.
- Instagram safe zones on the video: keep text out of the top 220 px and bottom 420 px; captions around y 1340-1460.
- Checklist for every still: no element covering another (stamps, boxes, pins over text), no text running off
  screen or wrapping badly, no empty half-screens, background art (kelp, maps) never behind text in a way that
  hurts reading. Proofread every word on screen, in the caption and in the DM text (spelling, awkward phrasing,
  numbers exactly as in the source).
- Re-check facts against the source just before writing the script. Say "about" when the source says "about".
