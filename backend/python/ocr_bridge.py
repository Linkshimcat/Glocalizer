"""Persistent JSONL bridge for PaddleOCR. stdout is reserved for protocol messages."""
import base64
import json
import sys


def emit(payload):
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


try:
    import numpy as np
    from PIL import Image
    from paddleocr import PaddleOCR
    # PaddlePaddle CPU/PIR의 oneDNN 변환 버그를 피한다. OCR bridge는 안정성을 우선한다.
    OCR = PaddleOCR(
        lang="korean",
        text_detection_model_name="PP-OCRv5_mobile_det",
        text_recognition_model_name="korean_PP-OCRv5_mobile_rec",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
        enable_mkldnn=False,
    )
    print("PaddleOCR loaded: PP-OCRv5_mobile_det + korean_PP-OCRv5_mobile_rec", file=sys.stderr, flush=True)
    LOAD_ERROR = None
except Exception as error:  # bridge must keep responding even when Python deps are absent
    OCR = None
    LOAD_ERROR = str(error)


def recognize(image_base64):
    raw = base64.b64decode(image_base64)
    image = np.array(Image.open(__import__('io').BytesIO(raw)).convert('RGB'))
    result = OCR.predict(image)
    regions = []
    for page in result:
        texts = page.get('rec_texts', [])
        scores = page.get('rec_scores', [])
        boxes = page.get('rec_polys', [])
        for text, score, box in zip(texts, scores, boxes):
            polygon = [{"x": float(point[0]), "y": float(point[1])} for point in box]
            regions.append({"text": str(text), "confidence": float(score), "polygon": polygon})
    return regions


for line in sys.stdin:
    try:
        request = json.loads(line)
        request_id = request["id"]
        if LOAD_ERROR:
            emit({"id": request_id, "error": {"code": "PADDLE_UNAVAILABLE", "message": f"PaddleOCR를 불러오지 못했습니다: {LOAD_ERROR}"}})
            continue
        emit({"id": request_id, "regions": recognize(request["imageBase64"])})
    except Exception as error:
        emit({"id": request.get("id", "unknown"), "error": {"code": "PADDLE_OCR_FAILED", "message": str(error)}})
