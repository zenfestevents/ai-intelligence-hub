# YouTube upload setup (one time, free)

This connects `tools/youtube.py` to your YouTube channel through Google's official YouTube Data API v3.
It takes about 15 minutes. Google changes its console wording now and then; if a button name below
doesn't match, look for the closest one.

Use the **same Google account that owns the YouTube channel** throughout (or one that is a manager of it).

## 1. Create a Google Cloud project
1. Go to https://console.cloud.google.com and sign in.
2. Top bar → project picker → **New project**. Name it anything, such as "Reel Uploader". No billing account is needed.
3. Make sure the new project is selected in the top bar.

## 2. Turn on the YouTube Data API
1. Left menu → **APIs & Services → Library**.
2. Search **YouTube Data API v3** → open it → **Enable**.

## 3. Set up the consent screen
1. Left menu → **APIs & Services → OAuth consent screen** (newer consoles call it **Google Auth Platform → Branding**). Click **Get started**.
2. App name: anything, such as "Reel Uploader". Support email: your email.
3. Audience: **External**. Contact email: your email. Accept the policy and **Create**.
4. Under **Audience → Test users**, click **Add users** and add the Google account that owns the channel.
5. Recommended: on the **Audience** page click **Publish app** (status becomes "In production").
   - While the app stays in **Testing**, Google signs you out every 7 days and you'd have to run `login` again weekly.
   - Publishing doesn't make anything public and needs no review for your own use. When you sign in you'll see a
     "Google hasn't verified this app" screen; click **Advanced → Go to Reel Uploader (unsafe)**. That's expected for your own app.

## 4. Create the OAuth client and download it
1. **APIs & Services → Credentials** (or **Google Auth Platform → Clients**) → **Create credentials → OAuth client ID**.
2. Application type: **Desktop app**. Name: anything. **Create**.
3. Click **Download JSON**.
4. Rename the file to `client_secret.json` and put it in `D:\AI Intelligent Hub\reels\`.
   It's already in `.gitignore`, so it won't be uploaded to GitHub. Don't share it.

## 5. Sign in once
```
.venv\Scripts\python.exe tools\youtube.py login
```
Your browser opens Google's sign-in. Pick the channel's account, allow both permissions
(upload videos, view your YouTube account). The tool saves a refresh token to `.env` as `YT_REFRESH_TOKEN`
and prints your channel name. If your account has several channels, Google asks which one; choose the right channel.

Check any time with:
```
.venv\Scripts\python.exe tools\youtube.py whoami
```

## Uploading
Dry run (shows the channel, title, tags and description; uploads nothing):
```
.venv\Scripts\python.exe tools\youtube.py post output\photo3d_v1.mp4 output\photo3d_caption.txt --thumb output\photo3d_cover.png
```
Upload for real: add `--yes` at the end.

- **Title**: the first line of the caption (YouTube allows 100 characters). Override with `--title "..."`.
- **Description**: the whole caption. **Tags**: the caption's hashtags.
- **Shorts**: a vertical video of 3 minutes or less becomes a Short automatically. The dry run says which it will be.
- `--privacy unlisted` or `--privacy private` to upload without publishing. Default is public.
- `--thumb cover.png` sets a custom thumbnail. This needs a phone-verified channel (https://www.youtube.com/verify)
  and an image under 2 MB. If it fails, the video is still uploaded; the tool just warns.
- `--synthetic` ticks YouTube's "altered or synthetic content" label. YouTube asks for it when realistic-looking
  people, places or events are AI-made; an AI voiceover over screen recordings usually doesn't need it.
- Captions that say "comment X and I'll DM you" don't work on YouTube (no DMs). The dry run flags this;
  use a YouTube version of the caption, such as "links in the pinned comment".
- Every upload is logged in `output/youtube_posts.jsonl`.

## Limits
- **Unverified projects upload as private.** Until your Google Cloud project passes YouTube's free API audit,
  YouTube locks every API upload to private, whatever `--privacy` says. The tool tells you when this happens.
  Make each video public in **YouTube Studio → Content → Visibility → Public**.
  To lift the lock, apply with the YouTube API Services audit form:
  https://support.google.com/youtube/contact/yt_api_form (choose the audit / quota extension option; it usually
  takes a few weeks). After approval, uploads go straight to public.
- **Daily quota**: the free quota is 10,000 units a day; one upload uses about 1,600, so roughly 6 uploads a day.
  It resets at midnight Pacific time.
- YouTube's music library and Shorts sounds can't be added through the API. The video's own audio is used.
