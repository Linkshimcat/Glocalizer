# **NAVER OGQ PROJECT**

### [Glocalizer]

Global + Localizer = 가장 로컬적인 것을 가장 글로벌하게 만들어주는 도구

#### **[배경]**

K-웹툰과 캐릭터 중심의 K-콘텐츠가 글로벌 시장에서 급격히 성장함에 따라, 국내 1인 창작자들의 해외 플랫폼 진출 수요와 마켓 성장 기회가 그 어느 때보다 확대되고 있는 사회적 흐름

#### **[문제점]**

**문화적 번역의 장벽**: 한국어 이모티콘의 핵심은 찰진 대사이지만, 이를 기존 번역기로 직역하면 딱딱하고 어색한 표현이 되어 이모티콘 특유의 맛과 감성이 현저히 떨어짐. 해외 마켓에 맞춘 유행이나 슬랭으로 번역하기엔 정보가 턱없이 부족하다는 것이 큰 문제임.

**번거로운 그래픽 수정 작업**: 글씨를 외국어로 바꾸려면 원래 이모티콘 이미지에서 한국어를 지우고, 비어버린 배경을 일일이 포토샵으로 메꾼 뒤, 새로운 글씨를 얹어야 하므로 디자이너가 없는 1인 작가나 소규모 팀에게는 이모티콘 레이어를 수정하는 작업은 시간 낭비이자 진입 장벽임.

---

#### **[해결 방안 (**Glocalizer**의 가치)]**

본 프로덕트는 사용자가 이모티콘 이미지를 업로드하면 이미지 속 한국어 글자 영역을 탐지하고, 안전하게 지울 수 있는 영역은 주변 색상과 형태를 바탕으로 자동 정리함. 이후 LLM이 한국어 원문의 의미와 말투를 대상 언어에 맞는 표현으로 현지화하고, 원본 스타일에 가까운 글꼴 후보와 함께 편집 가능한 결과를 제공함. OCR·번역·이미지 정리는 입력에 따라 실패하거나 부정확할 수 있으므로, 사용자는 에디터에서 원문과 번역문, 글자 영역, 배경 정리 방식, 글꼴과 위치를 직접 검토하고 수정할 수 있음.

---

#### **[시스템 아키텍처]**

```
[사용자 브라우저]
   │  이미지 업로드(최대 20장), 대상 언어 선택
   ▼
[Frontend: React SPA @ Vercel]
   │  REST 호출 (project 생성 → Storage 서명 URL로 직접 업로드 → 업로드 완료 통보 → 처리 시작)
   ▼
[Backend: Express API @ Render]
   │  1) POST /projects            → project/asset row 생성, Supabase Storage 서명 업로드 URL 발급
   │  2) 클라이언트가 Storage에 원본 이미지 직접 PUT (백엔드 경유 없음)
   │  3) POST /uploads/complete    → 업로드 검증
   │  4) POST /process             → job 테이블에 "process-project" job 등록 후 즉시 202 응답
   ▼
[Job Worker (같은 Node 프로세스 내 polling loop)]
   │  WORKER_POLL_INTERVAL_MS 주기로 job 테이블 polling, lease/heartbeat로 중복 실행 방지
   │  job 하나당 runLocalizationPipeline(projectId) 실행
   ▼
[Localization Pipeline] — 프로젝트 단위, 애셋별 부분 실패 허용
   1. OCR 단계
      원본 이미지 → GPT-5.6 Luna(주력, 유료 Vision API)로 이미지 내 모든 한글 캡션(줄바꿈·여러 캡션 포함)을
      한 번에 검출 → 실패하거나 한글을 못 찾으면 PaddleOCR(Python, JSONL 영속 브릿지)로 자동 폴백
      → PaddleOCR 경로일 때만 selectConsensusRegions로 다중 변형 IoU+텍스트 유사도 합의
      → 여러 줄로 잘린 캡션은 mergeWrappedLines로 한 캡션으로 병합
      → 합의도 낮음 + 한글 3자 이하 등 조건이면 Vision(Groq/Gemini) 폴백으로 재판정
   2. 번역 → 폰트 스타일 분석 (순차 실행, 실패는 서로 독립)
      - 번역: Groq(Qwen3.6 27B)로 원문 뉘앙스 반영한 다국어 번역 후보 생성
      - 폰트 스타일 분석: 번역 완료 후 Vision 모델이 원본 글자 크롭만 보고 굵기/둥글기/손글씨 여부/격식 태깅 (soft-fail)
   3. 이미지 정리(cleanup) 단계
      OCR 영역의 배경 복잡도와 마스크 안전성을 평가해 방향성 inpaint·단색 채우기·투명 처리를 선택
      → 마스크 신뢰도가 낮거나 OCR 검수가 필요하면 원본을 보존하고 에디터의 수동 정리 대상으로 표시
   4. 결과 저장 → project/asset 상태를 completed로 갱신
   ▼
[Supabase: PostgreSQL + Storage]
   원본/정리본 이미지는 private Storage 버킷, 메타데이터(OCR 영역·번역 후보·폰트 스타일·에디터 상태)는 Postgres
   ▼
[Frontend: 결과 조회 → AI 에디터]
   GET /results로 조립된 결과(원문/번역 후보/추천 폰트/정리본 URL) 수신
   → 클라이언트에서 cleanedUrl 위에 번역 텍스트를 CSS 오버레이로 얹어 실시간 편집(폰트·굵기·색·위치)
   → PNG export는 Canvas로 동일 로직 재합성, 여러 장은 JSZip으로 일괄 다운로드
   → 다운로드가 실제로 완료되는 시점마다 POST /projects/:id/downloads로 "변환 완주" 이벤트를 비동기 기록
      (북극성 지표. 아래 [핵심 기능 검증 가이드] 참고)
```

핵심 설계 포인트: 번역/OCR/클린업 각 단계가 애셋 단위로 독립 실패하고, 무거운 Python 작업(OCR)은 별도 프로세스로 격리, Job 테이블 기반 polling worker라 별도 큐 인프라(Redis/SQS 등) 없이 동작함.

---

#### **[핵심 기능 검증 가이드 — 심사위원용]**

**1. OCR 예외 처리**

다양한 이미지에서 한글 텍스트를 놓치거나 잘못 잘라내는 문제를 두 층위로 방어함.

| 방어 대상 | 구현 위치 | 관련 PR / 테스트 |
| --- | --- | --- |
| 한 캡션이 여러 줄로 잘려 인식되는 경우 | [`backend/src/ocr/merge-recognized-regions.ts`](https://github.com/Linkshimcat/Glocalizer/blob/main/backend/src/ocr/merge-recognized-regions.ts) — `belongsToNextLine` / `mergeWrappedLines`가 세로 간격·가로 겹침을 계산해 같은 캡션의 줄바꿈 조각을 하나로 병합 | [#24](https://github.com/Linkshimcat/Glocalizer/pull/24), [`merge-recognized-regions.test.ts`](https://github.com/Linkshimcat/Glocalizer/blob/main/backend/tests/unit/merge-recognized-regions.test.ts) |
| 한 이미지에 서로 다른 캡션이 여러 개인 경우 | [`backend/src/ocr/luna/luna-ocr.provider.ts`](https://github.com/Linkshimcat/Glocalizer/blob/main/backend/src/ocr/luna/luna-ocr.provider.ts) — 모든 캡션을 개별 영역(`regions[]`)으로 반환하도록 프롬프트 설계 | [#29](https://github.com/Linkshimcat/Glocalizer/pull/29) |
| OCR provider 자체가 실패(타임아웃/인증/요금 한도 등)하거나 한글을 못 찾은 경우 | [`backend/src/ocr/ocr-pipeline.service.ts`](https://github.com/Linkshimcat/Glocalizer/blob/main/backend/src/ocr/ocr-pipeline.service.ts) — 주력 provider(GPT-5.6 Luna) 실패 시 `getOcrFallbackProvider()`가 로컬 PaddleOCR로 자동 대체, 이미지 자체 처리 실패 시에도 다른 애셋 처리는 계속 진행 | [#29](https://github.com/Linkshimcat/Glocalizer/pull/29), [`luna-ocr.provider.test.ts`](https://github.com/Linkshimcat/Glocalizer/blob/main/backend/tests/unit/luna-ocr.provider.test.ts) |

정확도 근거: PIL로 픽셀 단위 정답 박스를 만들어 PaddleOCR·Gemini 3.7 Flash·GPT-5.6 Luna를 IoU 기준으로 직접 비교 — PaddleOCR 0.637, Gemini 0.923, **Luna 0.914(채택)**. 정확도가 근소한 대신 안정성(재시도 없이 8/8 성공)과 비용(₩ 기준 약 1/3.5)에서 우위를 보여 주력 엔진으로 선정함.

**2. 북극성 지표 — 변환 완주(다운로드) 횟수 카운팅**

> **지표명**: Glocalizer를 통해 배경 복원 및 초월 번역을 완료하여 최종 이모티콘 세트를 다운로드한 횟수
> **현재 값**: 0회 · **8주 뒤 목표치**: 50회 (실제 창작자 대상 유효 변환 완주 기준)

사용자가 에디터에서 "PNG 저장" 또는 "전체 ZIP 다운로드" 버튼을 눌러 결과물을 실제로 받아가는 순간을 "완주"로 정의하고, 그 순간마다 백엔드에 이벤트 하나를 기록함.

| 구성 요소 | 구현 위치 |
| --- | --- |
| DB 스키마 | [`supabase/migrations/015_create_download_events.sql`](https://github.com/Linkshimcat/Glocalizer/blob/main/supabase/migrations/015_create_download_events.sql) |
| 기록 API | `POST /projects/:projectId/downloads` — [`download.controller.ts`](https://github.com/Linkshimcat/Glocalizer/blob/main/backend/src/controllers/download.controller.ts) / [`download.routes.ts`](https://github.com/Linkshimcat/Glocalizer/blob/main/backend/src/routes/download.routes.ts) |
| 집계 조회 API | `GET /downloads/count` (관리자 키 인증, [`stats-auth.middleware.ts`](https://github.com/Linkshimcat/Glocalizer/blob/main/backend/src/middleware/stats-auth.middleware.ts)) |
| 프론트 연동 지점 | [`frontend/src/pages/Editor.tsx`](https://github.com/Linkshimcat/Glocalizer/blob/main/frontend/src/pages/Editor.tsx) — 단일 PNG 저장 2곳 + ZIP 일괄 다운로드 1곳, 실제 다운로드 성공 직후 fire-and-forget으로 기록 |
| 테스트 | [`backend/tests/integration/download-api.test.ts`](https://github.com/Linkshimcat/Glocalizer/blob/main/backend/tests/integration/download-api.test.ts) — 기록 성공/검증 실패/미인증 거부, 집계 인증 통과/거부 케이스 |
| 관련 PR | [#25](https://github.com/Linkshimcat/Glocalizer/pull/25) (PoC), [#26](https://github.com/Linkshimcat/Glocalizer/pull/26) (접근 제어) |

실사용 여부는 [production 서버](https://glocalizer-api.onrender.com/api/v1/health/ready)가 살아있는 상태에서 `GET /downloads/count`를 관리자 키와 함께 호출해 실시간으로 확인 가능함(키는 보안상 코드/리포에 노출하지 않으며 팀에 별도 요청 시 전달).

---

#### **[사용 스택]**

| **분류** | **기술 스택** |
| --- | --- |
| Backend | Node.js (v22+), TypeScript, Express 5, Supabase |
| Frontend | React 19, Vite, TypeScript, TailWind CSS |
| Design | Figma, Claude Design |

---

#### **[실행 방법]**

```bash
# 0. 사전 준비
#    - Node.js 22+, Python 3.12(PaddlePaddle이 3.14 미지원)
#    - Supabase 프로젝트(Postgres + Storage), Groq API 키
#    - OpenAI API 키는 OCR_PROVIDER=luna일 때만 필요
#      OPENAI_API_KEY 없이도 OCR_PROVIDER=paddle로 두면 PaddleOCR만으로 로컬 실행 가능

git clone https://github.com/Linkshimcat/Glocalizer.git
cd Glocalizer

# 1. 백엔드 (터미널 1, 저장소 루트에서 시작)
cd backend
cp .env.example .env        # SUPABASE_*, DATABASE_URL, GROQ_API_KEY, OPENAI_API_KEY 등 채우기
python3 -m venv python/.venv
python/.venv/bin/pip install -r python/requirements.txt
# .env의 OCR_PYTHON_EXECUTABLE을 python/.venv/bin/python3 절대경로로 지정
npm ci
npm run db:migrate          # supabase/migrations 순서대로 적용
npm run dev                 # http://localhost:3000, tsx watch

# 2. 프론트엔드 (터미널 2, 저장소 루트에서 시작)
cd frontend
cp .env.example .env
npm ci
npm run dev                 # http://localhost:5173, VITE_API_BASE_URL로 백엔드 지정

# 3. 검증 (저장소 루트에서 실행)
(cd backend && npm test)    # vitest
(cd frontend && npm run lint && npm run build)

# 배포는 각각 GitHub 연동 자동배포: backend → Render(Docker), frontend → Vercel
```

---

#### **[AI 사용 내역]**

AI가 만든 결과는 자동 확정하지 않음. OCR·번역·이미지 정리 결과를 에디터에서 사용자가 확인하고 직접 수정할 수 있으며, 자동 정리가 안전하지 않다고 판단되면 원본을 보존하고 수동 정리 대상으로 표시함.

**제품 실행 중 사용하는 AI·ML**

| 제공자·모델 | 사용 목적 | 전달 데이터 | 실패 대응 |
| --- | --- | --- | --- |
| OpenAI · GPT-5.6 Luna | `OCR_PROVIDER=luna` 배포에서 업로드 이미지의 한국어 문구와 좌표를 찾는 OCR | 크기를 제한한 업로드 이미지 | 호출 실패 또는 한글 미검출 시 로컬 PaddleOCR로 폴백 |
| PaddlePaddle · PP-OCRv5 Korean | 로컬 OCR 및 Luna 장애 시 폴백 | 서버 내부 이미지 처리, 외부 AI API 전송 없음 | 여러 전처리 결과의 IoU·문자 유사도 합의와 수동 영역 지정 제공 |
| Groq · Qwen3.6 27B | OCR 원문의 영어·일본어·중국어 현지화, 선택적 OCR 재판정과 글꼴 스타일 분석 | OCR 텍스트, 대상 언어, 필요한 경우 글자 영역 이미지 | 제한된 재시도 후 애셋별 오류 또는 soft-fail 처리 |
| Google · Gemini 2.5 Flash | OCR 합의도가 낮을 때 선택적으로 재판정하는 보조 Vision 모델 | 재판정이 필요한 이미지 | API 키가 없거나 호출에 실패하면 기존 OCR 결과와 수동 편집 경로 유지 |
| Google · Gemini 3.7 Flash | 2026-08-24 내부 OCR 정확도 벤치마크에만 사용한 비교 모델 | 벤치마크용 이미지 | 제품의 현재 런타임 모델에는 포함하지 않음 |

저장소 기본값은 `OCR_PROVIDER=paddle`이며, `OCR_PROVIDER`, `VISION_PROVIDER`, `ENABLE_FONT_STYLE_ANALYSIS` 환경변수로 각 기능의 사용 여부를 제어함. 프로젝트는 업로드 이미지를 자체 모델 학습 데이터로 사용하지 않으며, 외부 AI API를 사용하는 경우 해당 제공자의 데이터 처리 정책이 적용됨.

**개발 과정에서 사용한 생성형 AI**

| 도구 | 사용 범위 | 반영 원칙 |
| --- | --- | --- |
| ChatGPT / Codex | 코드 작성·검토, 테스트, 문서 초안 | 팀원이 diff와 실행 결과를 검토한 뒤 반영 |
| Claude Code | 코드·UI 아이디어와 디자인 보조 | 기존 디자인 시스템과 요구사항에 맞는지 사람이 검토 |
| Gemini / GLM | 기술 대안 비교와 문구 초안 | 제품 런타임 모델과 구분하며 결과를 그대로 확정하지 않음 |

생성형 AI는 구현·테스트·문서의 초안과 대안을 제안하는 데 사용함. 요구사항과 아키텍처 결정, Figma 원본 디자인, 적용할 코드 선택과 수정, 테스트·배포 결과 확인은 팀원이 직접 수행하며, AI 생성 결과를 검토 없이 제품에 반영하지 않음.

#### **[보안 점검]**

- 점검일: 2026-09-07
- 현재 Git 추적 파일에서 OpenAI·Groq·Gemini·Supabase 형식의 실제 키와 `API_KEY`·`SECRET`·`PASSWORD`·`SERVICE_ROLE_KEY`·`DATABASE_URL`에 직접 대입된 비밀값을 검색한 결과, 운영 비밀값은 발견되지 않음.
- 초기 Git 기록의 `backend/.env`에는 `SUPABASE_URL`과 레거시 `SUPABASE_ANON_KEY`가 포함된 적이 있음. `anon` 키는 공개 클라이언트용 키이며 비밀키는 아니지만, 현재는 파일을 추적 대상에서 제거했고 [`007_enable_rls.sql`](supabase/migrations/007_enable_rls.sql)에서 모든 서비스 테이블의 RLS를 활성화해 `anon`·`authenticated` 접근을 차단함. OpenAI·Groq·Gemini 키와 Supabase `service_role` 키가 커밋된 흔적은 발견되지 않음.
- 단위 테스트에는 외부 호출을 막기 위한 `test-groq-key`, `test-openai-key`만 존재하며 실제 인증 정보가 아님.
- 실제 값은 로컬 `backend/.env` 또는 Render·Vercel·Supabase의 환경변수로만 주입함. `.env`와 파생 파일은 `.gitignore`로 제외하고, 공유용 `.env.example`만 추적함.
- 향후 실제 비밀키가 Git 기록이나 외부 로그에 노출되면 환경변수로 옮기는 것만으로 끝내지 않고, 제공자 콘솔에서 기존 키를 폐기한 뒤 새 키를 발급함. Supabase 레거시 `anon` 키는 긴급 폐기 대상은 아니지만, 지원 종료 전에 새 publishable key로 이전함.

---

#### **[오픈소스 패키지 및 라이선스]**

아래 표는 `backend/package.json`, `frontend/package.json`, `backend/python/requirements*.txt`의 직접 의존성 기준임. 실제 배포에 포함되는 전이 의존성의 고지 사항은 각 lockfile과 패키지 배포본의 `LICENSE`를 함께 확인함.

**Backend · Node.js**

| 패키지 | 선언 버전 | 라이선스 | 용도 |
| --- | --- | --- | --- |
| @supabase/supabase-js | ^2.110.2 | MIT | Supabase Storage·Database 클라이언트 |
| cors / express / express-rate-limit | ^2.8.6 / ^5.2.1 / ^8.6.0 | MIT | HTTP API, CORS, 요청 속도 제한 |
| pg | ^8.22.0 | MIT | PostgreSQL 연결과 마이그레이션 |
| pino / pino-http / pino-pretty | ^10.3.1 / ^11.0.0 / ^13.1.3 | MIT | 구조화 로깅과 개발용 출력 |
| zod | ^4.4.3 | MIT | 요청·환경변수 스키마 검증 |
| dotenv | ^17.4.2 | BSD-2-Clause | 로컬 환경변수 로드 |
| sharp | ^0.35.3 | Apache-2.0 | 이미지 디코딩·마스킹·합성 |
| supertest / vitest / tsx | ^7.2.2 / ^4.1.10 / ^4.23.1 | MIT | 통합 테스트, 테스트 러너, TypeScript 실행 |
| typescript | ^7.0.2 | Apache-2.0 | 정적 타입 검사와 빌드 |
| @types/cors / @types/express / @types/node / @types/pg / @types/supertest | package.json 참조 | MIT | TypeScript 타입 선언 |

**Frontend · Node.js**

| 패키지 | 선언 버전 | 라이선스 | 용도 |
| --- | --- | --- | --- |
| react / react-dom / react-router-dom | ^19.2.7 / ^19.2.7 / ^7.18.1 | MIT | UI 렌더링과 클라이언트 라우팅 |
| tailwindcss / @tailwindcss/vite | ^4.3.2 | MIT | 스타일 시스템과 Vite 연동 |
| lucide-react | ^1.25.0 | ISC | 버튼·상태 아이콘 |
| jszip | ^3.10.1 | MIT 선택 사용 | 여러 PNG 결과의 ZIP 다운로드 |
| vite / @vitejs/plugin-react | ^8.1.1 / ^6.0.3 | MIT | 개발 서버와 production build |
| oxlint | ^1.71.0 | MIT | 정적 분석과 린트 |
| playwright | ^1.62.1 | Apache-2.0 | 브라우저 화면 검증 |
| typescript | ~6.0.2 | Apache-2.0 | 정적 타입 검사와 빌드 |
| @types/node / @types/react / @types/react-dom | package.json 참조 | MIT | TypeScript 타입 선언 |

**Backend · Python/OCR**

| 패키지 | 선언 버전 | 라이선스 | 용도 |
| --- | --- | --- | --- |
| paddleocr / paddlepaddle | >=3.0.0,<4.0.0 | Apache-2.0 | PP-OCRv5 기반 로컬 OCR |
| Pillow | >=10.0.0 | HPND | 이미지 입출력과 전처리 |
| NumPy | >=1.26.0 | BSD-3-Clause | 이미지 배열 연산 |
| opencv-contrib-python | >=4.9.0,<5.0.0 | Apache-2.0 | 마스크 기반 inpaint 처리 |
| openvino / opencv-python-headless | 선택 설치 | Apache-2.0 | Intel NPU OCR 추론과 이미지 처리 |
| paddle2onnx | 선택 설치 | Apache-2.0 | 로컬 OCR 모델의 ONNX 변환 |

주요 원문: [npm 패키지 정보](https://www.npmjs.com/), [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR), [PaddlePaddle](https://github.com/PaddlePaddle/Paddle), [Pillow](https://github.com/python-pillow/Pillow), [NumPy](https://github.com/numpy/numpy), [OpenCV](https://github.com/opencv/opencv), [OpenVINO](https://github.com/openvinotoolkit/openvino)

#### **[폰트·아이콘·이미지·영상 출처]**

| 에셋 | 출처·라이선스 | 사용 위치 |
| --- | --- | --- |
| Anton, Baloo 2, Bangers, Black Han Sans, Caveat, Comic Neue, Do Hyeon, Fredoka, Gaegu, Gothic A1, Jua, Lobster, Luckiest Guy, Nanum Pen Script, Noto Sans JP/KR/SC, Poppins | [Google Fonts](https://fonts.google.com/)에서 웹폰트로 로드하며 각 글꼴의 SIL Open Font License 1.1을 따름 | 에디터 번역문 글꼴 선택 |
| Lucide 아이콘 | [Lucide](https://lucide.dev/), ISC License | 공통 버튼과 상태 아이콘 |
| `iconsax-*.svg` 기반 아이콘 | [Iconsax](https://github.com/lusaxweb/iconsax), MIT License | AI 배지·안내 아이콘 |
| `GlocalizerLogo.png`, `GCFrontendUI/*`, `ServicePageLending/about-*.png`, `ProCards.png` | Glocalizer Team이 제작·편집한 Figma 및 서비스 UI 에셋 | 로고, 업로드·소개 화면 |
| `ServicePageLending/IntroduceVideo.mp4` | Glocalizer Team 제작 서비스 소개 영상 | 서비스 소개 페이지 |
| `LendingPage/GreenBackground-web.jpg` | [Magnific 원본](https://www.magnific.com/kr/free-vector/colorful-gradient-blur-background_16330574.htm), [라이선스 증명서](docs/licenses/GreenBackground-Magnific-license.pdf) · Free for commercial use WITH ATTRIBUTION · 저작자 `rawpixel.com - Magnific.com` · 웹 표시 문구 `designed by rawpixel.com - Magnific.com` | 결과·랜딩 배경 |
| `github-mark.svg` | [GitHub Logos and Usage](https://github.com/logos)의 표시 지침을 따름 | 공통 푸터 |

---

#### [외부 자문(교사/현직자)]

1. 사용자 접근성
낮은 기술 진입장벽: 글로벌 진출을 원하는 1인 창작자 대다수가 전문 그래픽 소프트웨어를 다루기 어려운데, '클릭 한 번'으로 텍스트를 지우고 해외 언어를 입히도록 만든 것은 사용자의 기술 진입장벽을 획기적으로 낮춘 훌륭한 설계임.
프론트엔드 최적화: 번역된 밈을 클라이언트 단에서 ZIP 파일 압축 및 다운로드하도록 처리하여 서비스 응답 속도와 서버 유지비용측면에서 좋은 선택을 함.
2. 사용성과 정확도의 딜레마 극복
OCR 오인식 및 오역을 막고자 사용자에게 '검수 및 확인 단계'를 강제 화면 전환으로 추가하면 피로감을 줄 수 있음. 별도 단계 추가 없이 번역 결과 화면에서 인식된 텍스트를 바로 수정하고 재처리할 수 있는 UI를 구현함으로써 작업 속도와 번역 정확도를 모두 잡은 훌륭한 설계임.
3. 원본 글자 노출 및 덮어씌우기 한계와 UX 솔루션
4. 현상 및 기술적 한계
글자 겹침 현상: 말풍선, 예능 자막 등 배경이 복잡하거나 그라데이션이 들어간 경우, 원본 한글 텍스트가 완벽히 삭제되지 않은 상태에서 번역 텍스트가 상단에 겹쳐 출력되는 가독성 저하 및 글자 겹침 문제가 발생함.
    
    기술적 딜레마: 무거운 AI 이미지 복원 모델을 사용하면 빠른 응답성이 저해되고, 단순 단색 박스로 가릴 경우 주변 이미지와 겉도는 부자연스러움이 발생함.
    
5. 기술 자문 및 UX 개선 방향
블러 마스킹 처리 후 번역 오버레이: 원본 텍스트를 강제로 지우는 대신 OCR이 인식한 영역만큼 강한 블러 처리를 적용하는 기법 제안. 원본 글자의 글자 형태를 뭉개어 알아 볼 수 없게 만든 뒤, 그 위에 번역 텍스트를 진하게 렌더링해 가독성 확보가능.
    
    말풍선/스티커 템블릿 및 수동 오버레이 UI 도입: 배경 복원이 어려운 복잡한 밈 이미지를 고려해, 사용자가 직접 문제를 해결할 수 있는 직관적인 수동 제어 UX 제안. 말풍선 스티커 추가 또는 이미지 업로드 기능을 도입하여, 깨끗한 말풍선/자막 바(혹은 사용자가 만든 템플릿)를 원본 글자 위에 직접 붙여 가린 후 번역문을 작성할 수 있도록 보완함.
   
---
# **[프로젝트 라이선스]**

Glocalizer 소스 코드는 [Apache License 2.0](https://github.com/Linkshimcat/Glocalizer?tab=Apache-2.0-1-ov-file)으로 배포함. 라이선스 전문과 조건은 [Apache License 2.0 공식 문서](https://www.apache.org/licenses/LICENSE-2.0)에서도 확인할 수 있음.
