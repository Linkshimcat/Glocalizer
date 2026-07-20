export interface NemotronOcrRequest {
  input: Array<{ type: 'image_url'; url: string }>;
}

/**
 * 아래는 실제 Nemotron OCR v2 응답을 호출해서 확인한 스키마다 (2026-07-20, 테스트 이미지 기준).
 * 예: { "data": [{ "index": 0, "text_detections": [{ "text_prediction": { "text": "열공",
 *      "confidence": 0.93 }, "bounding_box": { "points": [{x,y}×4] } }] }] }
 * 좌표(points)는 0~1 정규화 값이며, 회전이 없는 경우 좌상→우상→우하→좌하 순서의 4점이다.
 */
export interface RawOcrPoint {
  x: number;
  y: number;
}

export interface RawTextDetection {
  text_prediction: { text: string; confidence: number };
  bounding_box: { points: RawOcrPoint[] };
}

export interface RawOcrImageResult {
  index: number;
  text_detections: RawTextDetection[];
}

export interface NemotronOcrResponse {
  data: RawOcrImageResult[];
  usage?: { images_size_mb: number };
}
