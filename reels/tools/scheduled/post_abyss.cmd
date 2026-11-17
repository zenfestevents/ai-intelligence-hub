@echo off
cd /d "D:\AI Intelligent Hub\reels"
set PYTHONIOENCODING=utf-8
echo ==== %date% %time% >> "work\scheduled_post_abyss.log"
".venv\Scripts\python.exe" tools\instagram.py post output\abyss_v1_ig.mp4 output\abyss_caption.txt --thumb-ms 100 --yes >> "work\scheduled_post_abyss.log" 2>&1
".venv\Scripts\python.exe" tools\youtube.py post output\abyss_v1_ig.mp4 output\abyss_caption_yt.txt --yes >> "work\scheduled_post_abyss.log" 2>&1
