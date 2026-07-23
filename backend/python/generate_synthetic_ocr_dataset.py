"""Generate copyright-safe Korean emoticon text samples with PaddleOCR labels."""
from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

TEXTS = [
    "킹받았죠?", "아자스!", "완전 좋아", "헉 대박", "인정?", "오늘도 화이팅",
    "진짜냐고", "너무 웃겨", "고마워요", "잘했어!", "미안해…", "최고다",
]
FONT_PATHS = [
    Path("C:/Windows/Fonts/malgun.ttf"), Path("C:/Windows/Fonts/gulim.ttc"),
    Path("C:/Windows/Fonts/batang.ttc"),
    Path("/mnt/c/Windows/Fonts/malgun.ttf"), Path("/mnt/c/Windows/Fonts/gulim.ttc"),
    Path("/mnt/c/Windows/Fonts/batang.ttc"),
]

def font(size: int) -> ImageFont.FreeTypeFont:
    usable = [path for path in FONT_PATHS if path.exists()]
    if not usable:
        raise RuntimeError("Korean Windows fonts were not found.")
    return ImageFont.truetype(str(random.choice(usable)), size)

def polygon(left: int, top: int, right: int, bottom: int) -> list[list[int]]:
    return [[left, top], [right, top], [right, bottom], [left, bottom]]

def create_sample(index: int, output_dir: Path) -> tuple[str, str, list[list[int]]]:
    width, height = 512, 512
    background = random.choice([(255, 255, 255), (250, 248, 242), (240, 247, 255), (255, 243, 246)])
    image = Image.new("RGB", (width, height), background)
    draw = ImageDraw.Draw(image)
    text = random.choice(TEXTS)
    text_font = font(random.randint(36, 68))
    bbox = draw.textbbox((0, 0), text, font=text_font, stroke_width=2)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    left = max(22, (width - text_width) // 2 + random.randint(-45, 45))
    top = random.randint(70, 260)
    padding = random.randint(16, 28)
    bubble = (left - padding, top - padding, left + text_width + padding, top + text_height + padding)
    draw.rounded_rectangle(bubble, radius=random.randint(18, 36), fill=(255, 255, 255), outline=(25, 25, 25), width=random.randint(2, 4))
    draw.polygon([(bubble[2] - 55, bubble[3]), (bubble[2] - 28, bubble[3]), (bubble[2] - 38, bubble[3] + 25)], fill=(255, 255, 255), outline=(25, 25, 25))
    draw.ellipse((180, 300, 350, 470), fill=random.choice([(130, 130, 130), (170, 170, 170), (220, 180, 160)]), outline=(30, 30, 30), width=3)
    stroke = random.randint(0, 3)
    draw.text((left, top), text, font=text_font, fill=(20, 20, 20), stroke_width=stroke, stroke_fill=(255, 255, 255) if stroke else (20, 20, 20))
    if random.random() < 0.4:
        image = image.filter(ImageFilter.GaussianBlur(random.choice([0.35, 0.55, 0.8])))
    filename = f"synthetic_{index:05d}.png"
    image.save(output_dir / filename)
    return filename, text, polygon(left - stroke, top - stroke, left + text_width + stroke, top + text_height + stroke)

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=1000)
    parser.add_argument("--output-dir", type=Path, default=Path("training/ocr/generated"))
    parser.add_argument("--seed", type=int, default=20260723)
    args = parser.parse_args()
    random.seed(args.seed)
    images = args.output_dir / "images"
    images.mkdir(parents=True, exist_ok=True)
    records = []
    with (args.output_dir / "rec_gt_train.txt").open("w", encoding="utf-8") as recognition_labels:
        for index in range(args.count):
            filename, text, text_polygon = create_sample(index, images)
            relative = f"images/{filename}"
            recognition_labels.write(f"{relative}\t{text}\n")
            records.append({"image": relative, "text": text, "polygon": text_polygon})
    (args.output_dir / "det_gt_train.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {args.count} labeled samples in {args.output_dir}")

if __name__ == "__main__":
    main()
