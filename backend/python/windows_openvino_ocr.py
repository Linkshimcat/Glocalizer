"""Experimental Windows OpenVINO NPU OCR CLI for PP-OCRv5 ONNX artifacts."""
from __future__ import annotations

import argparse
import base64
import json
import sys
from pathlib import Path

import cv2
import numpy as np
import openvino as ov


DETECTION_SIZE = 1280
RECOGNITION_HEIGHT = 48
RECOGNITION_WIDTH = 640
DETECTION_THRESHOLD = 0.25
BOX_SCORE_THRESHOLD = 0.55
MIN_REGION_AREA = 3
BOX_EXPANSION_RATIO = 1.35


def normalize_detection(image: np.ndarray) -> tuple[np.ndarray, float, float]:
    height, width = image.shape[:2]
    scale = min(DETECTION_SIZE / height, DETECTION_SIZE / width)
    resized = cv2.resize(image, (round(width * scale), round(height * scale)))
    canvas = np.zeros((DETECTION_SIZE, DETECTION_SIZE, 3), dtype=np.uint8)
    canvas[: resized.shape[0], : resized.shape[1]] = resized
    rgb = cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    normalized = (rgb - np.array([0.485, 0.456, 0.406])) / np.array([0.229, 0.224, 0.225])
    return normalized.transpose(2, 0, 1)[None].astype(np.float32), scale, scale


def polygon_from_contour(contour: np.ndarray, scale_x: float, scale_y: float) -> list[dict[str, float]]:
    center, size, angle = cv2.minAreaRect(contour)
    expanded_size = (size[0] * BOX_EXPANSION_RATIO, size[1] * BOX_EXPANSION_RATIO)
    rectangle = cv2.boxPoints((center, expanded_size, angle))
    sums = rectangle.sum(axis=1)
    differences = np.diff(rectangle, axis=1).flatten()
    ordered = np.array(
        [rectangle[np.argmin(sums)], rectangle[np.argmin(differences)], rectangle[np.argmax(sums)], rectangle[np.argmax(differences)]],
        dtype=np.float32,
    )
    return [{"x": round(float(point[0] / scale_x), 2), "y": round(float(point[1] / scale_y), 2)} for point in ordered]


def contour_score(probability: np.ndarray, contour: np.ndarray) -> float:
    mask = np.zeros(probability.shape, dtype=np.uint8)
    cv2.fillPoly(mask, [contour], 1)
    return float(cv2.mean(probability, mask=mask)[0])


def detect_regions(detector: ov.CompiledModel, image: np.ndarray) -> list[list[dict[str, float]]]:
    tensor, scale_x, scale_y = normalize_detection(image)
    probability = detector([tensor])[detector.output(0)][0, 0]
    binary = (probability >= DETECTION_THRESHOLD).astype(np.uint8) * 255
    dilated = cv2.dilate(binary, np.ones((2, 2), dtype=np.uint8), iterations=1)
    contours, _ = cv2.findContours(dilated, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    regions = []
    for contour in contours:
        if cv2.contourArea(contour) < MIN_REGION_AREA or contour_score(probability, contour) < BOX_SCORE_THRESHOLD:
            continue
        regions.append(polygon_from_contour(contour, scale_x, scale_y))
    return sorted(regions, key=lambda region: (min(point["y"] for point in region), min(point["x"] for point in region)))


def crop_polygon(image: np.ndarray, polygon: list[dict[str, float]]) -> np.ndarray:
    points = np.array([[point["x"], point["y"]] for point in polygon], dtype=np.float32)
    width = max(1, round(max(np.linalg.norm(points[0] - points[1]), np.linalg.norm(points[2] - points[3]))))
    height = max(1, round(max(np.linalg.norm(points[0] - points[3]), np.linalg.norm(points[1] - points[2]))))
    target = np.array([[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]], dtype=np.float32)
    return cv2.warpPerspective(image, cv2.getPerspectiveTransform(points, target), (width, height), borderValue=(255, 255, 255))


def prepare_recognition(crop: np.ndarray) -> np.ndarray:
    ratio = RECOGNITION_HEIGHT / crop.shape[0]
    width = min(RECOGNITION_WIDTH, max(1, round(crop.shape[1] * ratio)))
    resized = cv2.resize(crop, (width, RECOGNITION_HEIGHT))
    canvas = np.ones((RECOGNITION_HEIGHT, RECOGNITION_WIDTH, 3), dtype=np.float32) * 255
    canvas[:, :width] = resized
    rgb = cv2.cvtColor(canvas.astype(np.uint8), cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    return ((rgb - 0.5) / 0.5).transpose(2, 0, 1)[None].astype(np.float32)


def load_characters(config_path: Path) -> list[str]:
    lines = config_path.read_text(encoding="utf-8").splitlines()
    start = lines.index("  character_dict:") + 1
    characters = []
    for line in lines[start:]:
        if not line.startswith("  - "):
            break
        characters.append(line[4:])
    return [""] + characters + [" "]


def decode_recognition(logits: np.ndarray, characters: list[str]) -> tuple[str, float]:
    indices = logits.argmax(axis=1)
    confidences = logits.max(axis=1)
    previous = -1
    result, scores = [], []
    for index, confidence in zip(indices, confidences):
        if index and index != previous and index < len(characters):
            result.append(characters[int(index)])
            scores.append(float(confidence))
        previous = int(index)
    return "".join(result).strip(), float(np.mean(scores)) if scores else 0.0


def recognize_regions(recognizer: ov.CompiledModel, image: np.ndarray, regions: list[list[dict[str, float]]], characters: list[str]) -> list[dict[str, object]]:
    recognized = []
    for polygon in regions:
        logits = recognizer([prepare_recognition(crop_polygon(image, polygon))])[recognizer.output(0)][0]
        text, confidence = decode_recognition(logits, characters)
        if text:
            recognized.append({"text": text, "confidence": round(confidence, 4), "polygon": polygon})
    return recognized


def recognize_image(detector: ov.CompiledModel, recognizer: ov.CompiledModel, characters: list[str], image: np.ndarray) -> list[dict[str, object]]:
    return recognize_regions(recognizer, image, detect_regions(detector, image), characters)


def load_engines(model_dir: Path) -> tuple[ov.CompiledModel, ov.CompiledModel, list[str]]:
    core = ov.Core()
    detector_model = core.read_model(model_dir / "PP-OCRv5_mobile_det.onnx")
    detector_model.reshape({detector_model.input(0): [1, 3, DETECTION_SIZE, DETECTION_SIZE]})
    recognizer_model = core.read_model(model_dir / "korean_PP-OCRv5_mobile_rec.onnx")
    recognizer_model.reshape({recognizer_model.input(0): [1, 3, RECOGNITION_HEIGHT, RECOGNITION_WIDTH]})
    return core.compile_model(detector_model, "NPU"), core.compile_model(recognizer_model, "NPU"), load_characters(model_dir / "korean_PP-OCRv5_mobile_rec.yml")


def run_jsonl(detector: ov.CompiledModel, recognizer: ov.CompiledModel, characters: list[str]) -> None:
    for line in sys.stdin:
        request = json.loads(line)
        request_id = request.get("id", "unknown")
        try:
            raw = base64.b64decode(request["imageBase64"])
            image = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)
            if image is None:
                raise ValueError("이미지 형식을 읽지 못했습니다.")
            print(json.dumps({"id": request_id, "regions": recognize_image(detector, recognizer, characters, image)}, ensure_ascii=False), flush=True)
        except (KeyError, ValueError, cv2.error) as error:
            print(json.dumps({"id": request_id, "error": {"code": "OPENVINO_OCR_FAILED", "message": str(error)}}, ensure_ascii=False), flush=True)


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", type=Path)
    parser.add_argument("--model-dir", type=Path, default=Path("training/ocr/openvino"))
    parser.add_argument("--jsonl", action="store_true")
    args = parser.parse_args()
    detector, recognizer, characters = load_engines(args.model_dir)
    if args.jsonl:
        run_jsonl(detector, recognizer, characters)
        return
    if args.image is None:
        raise ValueError("--image 또는 --jsonl 중 하나가 필요합니다.")
    image = cv2.imread(str(args.image), cv2.IMREAD_COLOR)
    if image is None:
        raise FileNotFoundError(f"이미지를 읽지 못했습니다: {args.image}")
    regions = recognize_image(detector, recognizer, characters, image)
    print(json.dumps({"provider": "openvino-npu", "regions": regions}, ensure_ascii=False))


if __name__ == "__main__":
    main()
