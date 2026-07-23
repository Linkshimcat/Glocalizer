"""Export the pinned PP-OCRv5 Paddle inference models to local ONNX files."""
from __future__ import annotations

import argparse
import shutil
import subprocess
from pathlib import Path


MODEL_NAMES = ("PP-OCRv5_mobile_det", "korean_PP-OCRv5_mobile_rec")


def export_model(model_root: Path, output_dir: Path, model_name: str) -> None:
    source_dir = model_root / model_name
    output_path = output_dir / f"{model_name}.onnx"
    if not source_dir.is_dir():
        raise FileNotFoundError(f"PaddleOCR model을 찾지 못했습니다: {source_dir}")
    subprocess.run(
        [
            "paddle2onnx",
            "--model_dir", str(source_dir),
            "--model_filename", "inference.json",
            "--params_filename", "inference.pdiparams",
            "--save_file", str(output_path),
            "--opset_version", "13",
            "--enable_onnx_checker", "True",
        ],
        check=True,
    )
    print(f"exported: {output_path}")


def export_character_dictionary(model_root: Path, output_dir: Path) -> None:
    source_path = model_root / "korean_PP-OCRv5_mobile_rec" / "inference.yml"
    output_path = output_dir / "korean_PP-OCRv5_mobile_rec.yml"
    if not source_path.is_file():
        raise FileNotFoundError(f"Korean recognition 설정을 찾지 못했습니다: {source_path}")
    shutil.copyfile(source_path, output_path)
    print(f"exported: {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-root", type=Path, default=Path.home() / ".paddlex" / "official_models")
    parser.add_argument("--output-dir", type=Path, default=Path("training/ocr/openvino"))
    args = parser.parse_args()
    if not shutil.which("paddle2onnx"):
        raise RuntimeError("paddle2onnx가 필요합니다. python3 -m pip install paddle2onnx 를 실행하세요.")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for model_name in MODEL_NAMES:
        export_model(args.model_root, args.output_dir, model_name)
    export_character_dictionary(args.model_root, args.output_dir)


if __name__ == "__main__":
    main()
