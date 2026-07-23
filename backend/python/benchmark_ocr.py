"""Run the exact PP-OCRv5 Korean model against a locally licensed benchmark manifest."""
from __future__ import annotations

import argparse
import json
import statistics
import time
from pathlib import Path

import numpy as np
from PIL import Image
from paddleocr import PaddleOCR

def compact(text: str) -> str:
    return "".join(text.split())

def cer(expected: str, actual: str) -> float:
    left, right = compact(expected), compact(actual)
    if not left:
        return 0.0 if not right else 1.0
    previous = list(range(len(right) + 1))
    for row, char in enumerate(left, start=1):
        current = [row]
        for column, target in enumerate(right, start=1):
            current.append(min(current[-1] + 1, previous[column] + 1, previous[column - 1] + (char != target)))
        previous = current
    return previous[-1] / len(left)

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    ocr = PaddleOCR(lang="korean", text_detection_model_name="PP-OCRv5_mobile_det", text_recognition_model_name="korean_PP-OCRv5_mobile_rec", use_doc_orientation_classify=False, use_doc_unwarping=False, use_textline_orientation=False, enable_mkldnn=False)
    rows, durations = [], []
    for item in manifest["items"]:
        started = time.perf_counter()
        prediction = ocr.predict(np.array(Image.open(item["localPath"]).convert("RGB")))
        duration_ms = round((time.perf_counter() - started) * 1000)
        texts = [str(text) for page in prediction for text in page.get("rec_texts", [])]
        actual = "".join(texts)
        durations.append(duration_ms)
        rows.append({"id": item["id"], "expected": item["expectedText"], "actual": actual, "exact": compact(actual) == compact(item["expectedText"]), "cer": cer(item["expectedText"], actual), "durationMs": duration_ms})
    report = {"itemCount": len(rows), "exactMatchRate": sum(row["exact"] for row in rows) / len(rows) if rows else 0, "meanCer": sum(row["cer"] for row in rows) / len(rows) if rows else 0, "medianDurationMs": statistics.median(durations) if durations else 0, "items": rows}
    report_dir = args.manifest.parent / "reports"; report_dir.mkdir(exist_ok=True)
    output = report_dir / f"ocr-benchmark-{int(time.time())}.json"
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({key: report[key] for key in ["itemCount", "exactMatchRate", "meanCer", "medianDurationMs"]}, ensure_ascii=False))
    print(output)

if __name__ == "__main__":
    main()
