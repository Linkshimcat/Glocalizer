# Korean emoticon OCR training preparation

1. Put only licensed or user-provided real images in `backend/benchmarks/ocr/images/` locally.
2. Add a human-verified Korean text label and polygon to `manifest.local.json`.
3. Generate copyright-safe synthetic samples with `npm run dataset:generate`, then make a deterministic 80/10/10 split with `npm run dataset:split`.
4. Run `python3 python/benchmark_ocr.py --manifest training/ocr/generated/benchmark_manifest.json` to record the baseline before and after fine-tuning.

`generated/rec_gt_train.txt` is PaddleOCR recognition training format (`image_path<TAB>text`). `generated/det_gt_train.json` keeps text polygons for detector annotation conversion. Fine-tuning is not started automatically: require a licensed dataset, benchmark baseline, GPU training environment, and held-out test set first.
