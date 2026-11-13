# Instagram posting setup (one time, free)

This connects `tools/instagram.py` to your Instagram account through Meta's official Instagram API.
Repeat it for each Instagram account you want to post to (each gets its own token).

Meta changes its dashboard wording now and then. If a button name below doesn't match, look for the closest one.

## 1. Make the Instagram account Professional
Instagram app → Settings → **Account type and tools** → **Switch to professional account** → choose **Creator** or **Business**. This is free.

## 2. Create a Meta developer app
1. Go to https://developers.facebook.com and log in with your Facebook account. If asked, register as a developer (free).
2. **My Apps → Create app**.
3. Use case: **Manage messaging & content on Instagram**. App type, if asked: **Business**.
4. Give it any name, such as "Reel Poster". You don't need to publish the app; it can stay in development mode for your own accounts.

## 3. Connect your Instagram account and get a token
1. In the app dashboard, open **Instagram → API setup with Instagram login**.
2. Under **Generate access tokens**, click **Add account** and log in to the Instagram account you post from. Accept the permissions.
   It needs `instagram_business_basic` and `instagram_business_content_publish`.
3. Click **Generate token** next to the account and copy it. This is a long-lived token, valid for 60 days.

## 4. Put the token in `.env`
Open `D:\AI Intelligent Hub\reels\.env` in Notepad and add one line:

```
IG_ACCESS_TOKEN=paste_the_token_here
```

Save the file. Don't share the token with anyone; it gives posting access to the account.

## 5. Check it works
```
.venv\Scripts\python.exe tools\instagram.py whoami
```
It should print your username.

## Posting
Dry run (shows the account, video and caption; uploads nothing):
```
.venv\Scripts\python.exe tools\instagram.py post output\ai_tools_5_free_final.mp4 output\ai_tools_5_free_caption.txt --thumb-ms 4600
```
Publish for real: add `--yes` at the end.

- `--thumb-ms 4600` uses the frame at 4.6 s as the cover (the same frame as `ai_tools_5_free_cover.png`).
  The API can only use a custom cover image if it's hosted at a public web link, so the tool picks a frame from the video instead.
- `--no-feed` posts to the Reels tab only, not the profile grid.
- Every published post is logged in `output/instagram_posts.jsonl`.

## Keeping the token alive
Tokens expire after 60 days. Any time before then, run:
```
.venv\Scripts\python.exe tools\instagram.py refresh
```
It extends the token by another 60 days and saves it to `.env`.

## Limits
- Music from Instagram's library can't be added through the API. The reel's own audio is used.
- Captions: up to 2200 characters and 5 hashtags (Instagram limit since Dec 2025). The tool checks both before uploading.
- The comment-to-DM automation stays in Zorcha; this tool only publishes.
