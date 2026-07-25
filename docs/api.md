# Backend API additions

## `PATCH /api/v1/projects/:projectId/assets/:assetId/ocr`

`X-Project-Token`이 필요하다. 대표 OCR 문구와 normalized bbox를 수정하고 해당 asset의 번역·cleanup만 무효화한 뒤 재실행한다.

```json
{ "text": "킹받았죠?", "normalizedBox": { "x": 0.2, "y": 0.3, "width": 0.5, "height": 0.14 } }
```

응답은 `202 { "assetId": "…", "status": "reprocessing", "jobId": "…" }`이다. 수정 요청은 OCR 영역만 즉시 저장하고, 번역·cleanup은 background job으로 처리한다. 다른 asset의 결과는 변경하지 않는다.
# API

## Health

### `GET /api/v1/health`

프로세스 liveness 확인용 endpoint입니다. DB나 Storage 상태와 무관하게 backend 프로세스가 응답하면 `200`을 반환합니다.

### `GET /api/v1/health/ready`

배포 readiness 확인용 endpoint입니다. Supabase `jobs` table과 private Storage bucket을 함께 확인합니다.

- 정상: `200` / `{ "status": "ready", "dependencies": { "database": true, "storage": true } }`
- 의존성 장애: `503` / `{ "status": "unavailable", "dependencies": { ... } }`

## Asset retry

### `POST /api/v1/projects/:projectId/assets/:assetId/retry`

실패한 이미지 한 장만 기존 원본과 프로젝트 설정으로 다시 처리합니다. `X-Project-Token`이 필요합니다.

- 성공: `202` / `{ "jobId": "...", "status": "running" }`
- 처리 중인 project가 있으면: `409 PROCESS_ALREADY_RUNNING`
- 실패 상태가 아닌 asset이면: `400 INVALID_REQUEST`
