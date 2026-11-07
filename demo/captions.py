"""Renders caption images for the demo video: one transparent 1920x1080 PNG per caption, plus captions.json.

The captions are the narration, split into sentences and timed across each scene's voice-over.
Usage: python3 demo/captions.py
"""
import json
import re
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

here = Path(__file__).parent
work = here / "work"
narration = json.loads((here / "narration.json").read_text())
meta = json.loads((work / "meta.cut.json").read_text())
voice = json.loads((work / "voice" / "durations.json").read_text())

out = work / "captions"
out.mkdir(parents=True, exist_ok=True)
for old in out.glob("*.png"):
    old.unlink()

font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 38)
t0 = meta["starts"]["s1"]
captions = []

for scene in narration["scenes"]:
    sid = scene["id"]
    sentences = [s.strip() for s in re.split(r"(?<=[.:])\s+", scene["text"]) if s.strip()]
    total = sum(len(s) for s in sentences)
    cursor = meta["starts"][sid] - t0
    span = voice[sid]
    for sentence in sentences:
        length = span * len(sentence) / total
        captions.append({"text": sentence, "start": round(cursor, 3), "end": round(cursor + length, 3)})
        cursor += length

for index, caption in enumerate(captions):
    image = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    lines = textwrap.wrap(caption["text"], width=60)
    line_height = 54
    box_h = line_height * len(lines) + 28
    widest = max(draw.textlength(line, font=font) for line in lines)
    box_w = widest + 80
    x0 = (1920 - box_w) / 2
    y1 = 1080 - 36
    y0 = y1 - box_h
    draw.rounded_rectangle([x0, y0, x0 + box_w, y1], radius=22, fill=(29, 27, 22, 214))
    for row, line in enumerate(lines):
        w = draw.textlength(line, font=font)
        draw.text(((1920 - w) / 2, y0 + 14 + row * line_height), line, font=font, fill=(247, 244, 236, 255))
    path = out / f"{index:02d}.png"
    image.save(path)
    caption["file"] = str(path)

(work / "captions.json").write_text(json.dumps(captions, indent=2))
print(f"{len(captions)} captions")
