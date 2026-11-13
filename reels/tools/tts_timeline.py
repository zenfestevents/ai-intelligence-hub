"""Generate one voice clip per script segment with edge-tts and lay them out on a frame timeline.

Usage: python tts_timeline.py <script.json> <audio_out_dir> <timing_out.json>
"""
import asyncio
import json
import math
import subprocess
import sys
from pathlib import Path

import edge_tts


def duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


async def main() -> None:
    spec = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    audio_dir = Path(sys.argv[2])
    audio_dir.mkdir(parents=True, exist_ok=True)
    timing_path = Path(sys.argv[3])
    fps = spec["fps"]

    for scene in spec["scenes"]:
        for seg in scene["segments"]:
            raw = audio_dir / f"{seg['id']}.raw.mp3"
            await edge_tts.Communicate(seg["text"], spec["voice"], rate=spec.get("rate", "+0%")).save(str(raw))
            # Trim leading/trailing silence so lines butt up tightly.
            trim = "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse"
            subprocess.run(
                ["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-af", trim, str(audio_dir / f"{seg['id']}.mp3")],
                check=True,
            )
            raw.unlink()

    frame = spec["lead_in"]
    scenes, segments = {}, {}
    for scene in spec["scenes"]:
        start = frame - spec["lead_in"] if not scenes else frame
        for seg in scene["segments"]:
            dur = math.ceil(duration(audio_dir / f"{seg['id']}.mp3") * fps)
            segments[seg["id"]] = {"from": frame, "rel": frame - start, "dur": dur}
            frame += dur + spec["seg_gap"]
        end = frame - spec["seg_gap"] + scene["tail"]
        scenes[scene["id"]] = {"from": start, "dur": end - start}
        frame = end + 4  # small breath before the next scene's first line

    total = frame - 4
    timing = {"fps": fps, "total": total, "scenes": scenes, "segments": segments}
    timing_path.write_text(json.dumps(timing, indent=2), encoding="utf-8")
    print(json.dumps(timing, indent=2))


asyncio.run(main())
