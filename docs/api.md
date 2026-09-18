# API

모든 endpoint는 `/api/v1` prefix 아래에 있고, rate limit이 공통으로 적용된다.

## 인증

| 헤더 | 적용 대상 |
| --- | --- |
| 없음 | health, `POST /projects` |
| `X-Project-Token` | 특정 project·asset을 다루는 모든 endpoint |
| `X-Admin-Key` | 집계 통계 (`GET /downloads/count`) |

## Endpoint 목록

| Method | Path | 인증 | 설명 |
| --- | --- | --- | --- |
| `GET` | `/health` | — | 프로세스 liveness |
| `GET` | `/health/ready` | — | 배포 readiness (DB + Storage) |
| `POST` | `/projects` | — | project 생성 |
| `DELETE` | `/projects/:projectId` | Project | project 삭제 |
| `POST` | `/projects/:projectId/uploads/complete` | Project | 업로드 완료 통지 |
| `POST` | `/projects/:projectId/process` | Project | 파이프라인 시작 |
| `GET` | `/projects/:projectId/status` | Project | 진행 상태 조회 |
| `POST` | `/projects/:projectId/assets/:assetId/retry` | Project | 실패한 이미지 1장 재처리 |
| `GET` | `/projects/:projectId/results` | Project | 결과 조회 |
| `PUT` | `/projects/:projectId/assets/:assetId/editor-state` | Project | 에디터 상태 저장 |
| `POST` | `/projects/:projectId/assets/:assetId/regenerate` | Project | 번역 후보 재생성 |
| `PATCH` | `/projects/:projectId/assets/:assetId/ocr` | Project | 대표 OCR 문구·bbox 수정 |
| `POST` | `/projects/:projectId/assets/:assetId/ocr/regions/detect` | Project | 지정 영역 OCR 재검출 |
| `POST` | `/projects/:projectId/assets/:assetId/ocr/regions` | Project | OCR 영역 수동 추가 |
| `POST` | `/projects/:projectId/downloads` | Project | 다운로드 이벤트 기록 |
| `GET` | `/downloads/count` | Admin | 다운로드 집계 |

아래는 동작이 단순 CRUD와 다른 endpoint의 상세다.

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

## OCR 수정

### `PATCH /api/v1/projects/:projectId/assets/:assetId/ocr`

`X-Project-Token`이 필요하다. 대표 OCR 문구와 normalized bbox를 수정하고 해당 asset의 번역·cleanup만 무효화한 뒤 재실행한다.

```json
{ "text": "킹받았죠?", "normalizedBox": { "x": 0.2, "y": 0.3, "width": 0.5, "height": 0.14 } }
```

응답은 `202 { "assetId": "…", "status": "reprocessing", "jobId": "…" }`이다. 수정 요청은 OCR 영역만 즉시 저장하고, 번역·cleanup은 background job으로 처리한다. 다른 asset의 결과는 변경하지 않는다.

## Account cloud workspaces

New account workspaces use the existing custom login JWT (`Authorization: Bearer …`), not Supabase Auth. The backend checks `owner_id` for every project request. `X-Project-Token` alone cannot access an owned workspace. Existing anonymous projects retain their token access and expiry; they are not automatically assigned to an account.

- `GET /projects`: returns `{ projects: [{ id, name, status, resultReady, targetLanguages, imageCount, thumbnailUrl, createdAt, updatedAt }] }` for the current account.
- `POST /projects/drafts`: creates an owned upload draft. Body: existing project options/files metadata, `targetLanguages` (may be empty before selection), and `selectedClientIds`.
- `PUT /projects/:projectId/draft`: synchronizes files, selection and target languages while the project is `created`; returns signed upload URLs for new/pending files. Empty file manifests are permitted when removing all images.
- Existing `uploads/complete` validates stored image bytes. The frontend waits for upload/validation before reporting the draft as saved.
- `GET /projects/:projectId/workspace`: returns current status/results, original file metadata/IDs, selected client IDs and `resultReady`. Each open refreshes private image URLs and restores region editor states.
- `POST /projects/:projectId/finish`: persists `resultReady` after processing and export; processing projects cannot be finished. The dashboard lists unfinished work, and `/archive` lists finished work.

Owned projects have `expires_at = null` and are excluded from expiry cleanup. Browser storage retains only the selected project ID and account ID as navigation pointers; images and styles are restored from the server. Pending upload/edit writes display errors and can be retried. Editing uses the existing editor-state API and flushes writes before marking a result ready or starting a new task. Concurrent editing in different devices is last-write-wins; no shared live editing is implemented.

### Rollout

Apply `supabase/migrations/20260918174815_account_projects.sql` using the repository migration runner before deploying the backend, then deploy the frontend. The runner accepts existing 3-digit names and Supabase CLI timestamp names. The Docker image currently does not run migrations automatically: run them separately against the configured deployment database. Owned workspaces use backend-only tables with RLS enabled; no public read policies or service-role keys are added to the frontend.
