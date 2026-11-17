@echo off
cd /d "D:\AI Intelligent Hub\reels"
set PYTHONIOENCODING=utf-8
echo ==== %date% %time% >> "work\scheduled_post_maps.log"
".venv\Scripts\python.exe" tools\instagram.py post output\maps_v1_ig.mp4 output\maps_caption.txt --thumb-ms 100 --yes >> "work\scheduled_post_maps.log" 2>&1
