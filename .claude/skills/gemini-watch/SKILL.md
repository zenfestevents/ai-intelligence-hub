---
name: gemini-watch
description: Watch a YouTube video with Gemini and return detailed notes. Use when the user shares a YouTube link and wants it summarised, broken down, or studied.
---

Run this command with the video URL and a prompt describing what to extract:

python ~/.claude/skills/gemini-watch/watch.py "<url>" "<prompt>"

Default prompt if the user gives none: "Break this video down as a lesson. List every technique, rule, or decision the creator makes, with timestamps and the reason they give for it."

Return the output as structured notes.