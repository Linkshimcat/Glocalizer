"""One-shot OpenCV inpaint bridge. 요청 하나당 프로세스 하나 — OCR 모델과 달리 로드 비용이
없어서(cv2.inpaint는 사전 학습된 모델을 쓰지 않음) 상주 브릿지가 필요 없다.
stdin으로 JSON 요청 하나를 받아 stdout으로 JSON 응답 하나를 쓴다."""
import base64
import json
import sys


def emit(payload):
    sys.stdout.write(json.dumps(payload, ensure_ascii=False))
    sys.stdout.flush()


def main():
    request = json.loads(sys.stdin.read())
    try:
        import numpy as np
        import cv2

        image_bytes = base64.b64decode(request["imageBase64"])
        mask_bytes = base64.b64decode(request["maskBase64"])

        image = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
        mask = cv2.imdecode(np.frombuffer(mask_bytes, dtype=np.uint8), cv2.IMREAD_GRAYSCALE)
        if image is None or mask is None:
            raise ValueError("이미지 또는 마스크 디코딩에 실패했습니다.")

        radius = int(request.get("radius", 3))
        algorithm = request.get("algorithm", "telea")
        flag = cv2.INPAINT_TELEA if algorithm == "telea" else cv2.INPAINT_NS

        # cv2.inpaint는 알파 채널을 지원하지 않아 RGB만 복원하고 알파는 원본 그대로 합친다.
        if image.ndim == 3 and image.shape[2] == 4:
            bgr = image[:, :, :3]
            alpha = image[:, :, 3]
            restored = cv2.inpaint(bgr, mask, radius, flag)
            result = cv2.merge([restored[:, :, 0], restored[:, :, 1], restored[:, :, 2], alpha])
        else:
            result = cv2.inpaint(image, mask, radius, flag)

        ok, encoded = cv2.imencode(".png", result)
        if not ok:
            raise RuntimeError("결과 PNG 인코딩에 실패했습니다.")

        emit({"resultBase64": base64.b64encode(encoded.tobytes()).decode("ascii")})
    except Exception as error:  # bridge는 실패해도 항상 JSON으로 응답해야 호출부가 안전하게 처리한다
        emit({"error": {"code": "INPAINT_FAILED", "message": str(error)}})


main()
