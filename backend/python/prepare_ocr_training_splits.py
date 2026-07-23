"""Create deterministic train/validation/test splits and a held-out benchmark manifest."""
from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset-dir", type=Path, default=Path("training/ocr/generated"))
    parser.add_argument("--seed", type=int, default=20260723)
    args = parser.parse_args()
    records = json.loads((args.dataset_dir / "det_gt_train.json").read_text(encoding="utf-8"))
    random.Random(args.seed).shuffle(records)
    count = len(records)
    train_end, validation_end = int(count * 0.8), int(count * 0.9)
    splits = {"train": records[:train_end], "validation": records[train_end:validation_end], "test": records[validation_end:]}
    for name, rows in splits.items():
        with (args.dataset_dir / f"rec_gt_{name}.txt").open("w", encoding="utf-8") as output:
            for row in rows:
                output.write(f"{row['image']}\t{row['text']}\n")
    manifest = {
        "version": 1,
        "source": "synthetic-emoticon-text",
        "items": [
            {"id": f"synthetic-test-{index:03d}", "localPath": str((args.dataset_dir / row["image"]).resolve()), "expectedText": row["text"], "license": "generated", "regions": [{"text": row["text"], "polygon": row["polygon"]}]}
            for index, row in enumerate(splits["test"])
        ],
    }
    (args.dataset_dir / "benchmark_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"train": len(splits["train"]), "validation": len(splits["validation"]), "test": len(splits["test"])}, ensure_ascii=False))

if __name__ == "__main__":
    main()
