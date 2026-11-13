"""Turn an ElevenLabs character alignment into a reel timeline (segments + word timings).

The script's segments are spoken as one take, joined with single spaces. Each segment's
start/end comes from its characters' times; each word's from its own characters.
Without an alignment file, durations are estimated from text length (for layout previews).

Usage: python build_alignment_timeline.py <script.json> <timing_out.json> [alignment.json]
"""
import json
import math
import sys
from pathlib import Path

spec = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
out = Path(sys.argv[2])
align = json.loads(Path(sys.argv[3]).read_text(encoding="utf-8")) if len(sys.argv) > 3 else None
fps, lead = spec["fps"], spec["lead_in"]
segs = spec["segments"]
full = " ".join(s["text"] for s in segs)

if align:
    chars = align["characters"]
    starts = align["character_start_times_seconds"]
    ends = align["character_end_times_seconds"]
    if "".join(chars) != full:
        sys.exit("alignment text does not match the script")
else:
    # Rough estimate: about 14 characters a second.
    starts = [i / 14 for i in range(len(full))]
    ends = [(i + 1) / 14 for i in range(len(full))]

def apply_replacements(words):
    """Merge words per display_replace, e.g. the spoken brand name back to '64 Sqft'."""
    for spoken, shown in spec.get("display_replace", {}).items():
        parts = spoken.split()
        i = 0
        while i <= len(words) - len(parts):
            if [w["text"] for w in words[i : i + len(parts)]] == parts:
                words[i : i + len(parts)] = [{"text": shown, "start": words[i]["start"], "end": words[i + len(parts) - 1]["end"]}]
            i += 1
    return words

lead_s = lead / fps
pos = 0
segments = []
for s in segs:
    text = s["text"]
    a, b = pos, pos + len(text) - 1
    words, i = [], a
    for w in text.split(" "):
        j = i + len(w) - 1
        words.append({"text": w, "start": round(starts[i] + lead_s, 3), "end": round(ends[j] + lead_s, 3)})
        i = j + 2
    seg_from = math.floor((starts[a] + lead_s) * fps)
    seg_end = math.ceil((ends[b] + lead_s) * fps)
    segments.append({"id": s["id"], "from": seg_from, "dur": seg_end - seg_from, "words": apply_replacements(words)})
    pos = b + 2

speech_end = segments[-1]["from"] + segments[-1]["dur"]
total = speech_end + 12 + spec["closing"]
out.write_text(
    json.dumps({"fps": fps, "lead_in": lead, "speech_end": speech_end, "total": total, "estimated": align is None, "segments": segments}, indent=2, ensure_ascii=False),
    encoding="utf-8",
)
print(f"{'estimated' if align is None else 'aligned'}: speech ends {speech_end / fps:.1f}s, total {total / fps:.1f}s")
for s in segments:
    print(f"  {s['id']}: {s['from'] / fps:.2f}s +{s['dur'] / fps:.2f}s, {len(s['words'])} words")
