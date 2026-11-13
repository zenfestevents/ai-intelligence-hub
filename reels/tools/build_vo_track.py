"""Join per-line voice clips into one continuous track and write an edit timeline.

Each segment gets a mode (A = avatar full screen, S = split screen, B = full b-roll)
and approximate word timings (segment duration split by word length).

Usage: python build_vo_track.py <edit.json> <track_out.wav> <timing_out.json>
"""
import json
import math
import subprocess
import sys
from pathlib import Path


def duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


def main() -> None:
    spec = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    track_out = Path(sys.argv[2])
    timing_out = Path(sys.argv[3])
    fps = spec["fps"]
    audio_dir = Path(spec["audio_dir"])

    inputs, filters, labels = [], [], []
    frame = spec["lead_in"]
    segments = []
    for i, seg in enumerate(spec["segments"]):
        clip = audio_dir / f"{seg['id']}.mp3"
        dur = math.ceil(duration(clip) * fps)
        # Words get time in proportion to their length; good enough for caption highlighting.
        words = seg["text"].split()
        weights = [len(w) + 2 for w in words]
        total_w = sum(weights)
        t = frame / fps
        word_times = []
        for w, wt in zip(words, weights):
            d = dur / fps * wt / total_w
            word_times.append({"text": w, "start": round(t, 3), "end": round(t + d, 3)})
            t += d
        segments.append({"id": seg["id"], "mode": seg["mode"], "from": frame, "dur": dur, "words": word_times})

        inputs += ["-i", str(clip)]
        pad = (dur / fps - duration(clip)) + seg["gap"] / fps
        filters.append(f"[{i}:a]aresample=48000,apad=pad_dur={pad:.3f}[a{i}]")
        labels.append(f"[a{i}]")
        frame += dur + seg["gap"]

    total = frame + spec["tail"]
    lead = spec["lead_in"] / fps
    graph = ";".join(filters) + f";{''.join(labels)}concat=n={len(labels)}:v=0:a=1,adelay={int(lead * 1000)}:all=1,apad=whole_dur={total / fps:.3f}[out]"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", graph, "-map", "[out]", "-ac", "1", str(track_out)],
        check=True,
    )
    timing_out.write_text(json.dumps({"fps": fps, "total": total, "segments": segments}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"total {total} frames ({total / fps:.1f}s), track {duration(track_out):.2f}s")


main()
