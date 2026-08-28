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

본 프로덕트는 사용자가 이모티콘 이미지를 업로드하고 클릭 한 번만 하면, 이모티콘 이미지 속 한국어 글자의 위치를 정확히 찾아내고, 해당 글자 영역을 단순히 지우는 것에 그치지 않고, 글자 뒤에 가려져 있던 캐릭터나 배경을 AI가 예측하여 자연스럽게 채워 넣음. 대상 국가의 최신 인터넷 밈, 신조어, 유행어를 학습한 LLM을 활용해, 한국어 원문의 뉘앙스를 현지 청소년들이 진짜 쓰는 찰진 표현으로 자연스럽게 치환함. 현지에서 이모티콘에 자주 쓰이는 귀엽고 개성 있는 무료 폰트들을 매칭하고, 원본의 구도에 맞게 텍스트를 얹어 최종 완성본을 제공함.

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
   2. 번역 + 폰트 스타일 분석 (병렬, 서로 독립)
      - 번역: Groq(Qwen3.6 27B)로 원문 뉘앙스 반영한 다국어 번역 후보 생성
      - 폰트 스타일 분석: Vision 모델이 원본 글자 크롭만 보고 굵기/둥글기/손글씨여부/격식 태깅 (soft-fail)
   3. 이미지 정리(cleanup) 단계
      OCR 영역을 Sharp로 크롭→블러→합성 (배경 재구성 없이 항상 성공)
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
| Backend | Node.js (v22+) , TypeScript, Express 5, supabase |
| Frontend | React 19, Vite, TypeScript, TailWind CSS |
| Design | Figma, Claude Design |

---

#### **[실행 방법]**

```bash
# 0. 사전 준비
#    - Node.js 20+, Python 3.12(PaddlePaddle이 3.14 미지원)
#    - Supabase 프로젝트(Postgres + Storage), Groq API 키, OpenAI API 키(OCR 주력, OCR_PROVIDER=luna일 때 필요)
#      OPENAI_API_KEY 없이도 OCR_PROVIDER=paddle로 두면 PaddleOCR만으로 로컬 실행 가능

# 1. 백엔드
cd backend
cp .env.example .env        # SUPABASE_*, DATABASE_URL, GROQ_API_KEY, OPENAI_API_KEY 등 채우기
python3 -m venv python/.venv
python/.venv/bin/pip install -r python/requirements.txt
# .env의 OCR_PYTHON_EXECUTABLE을 python/.venv/bin/python3 절대경로로 지정
npm install
npm run db:migrate          # supabase/migrations 순서대로 적용
npm run dev                 # http://localhost:3000, tsx watch

# 2. 프론트엔드
cd frontend
npm install
npm run dev                 # http://localhost:5173, VITE_API_BASE_URL로 백엔드 지정

# 3. 테스트
cd backend && npm test      # vitest
cd frontend && npx tsc --noEmit && npm run build

# 배포는 각각 GitHub 연동 자동배포: backend → Render(Docker), frontend → Vercel
```

---

#### **[AI 사용 내역]**

Claude, ChatGPT, Gemini, GLM

---

#### **하단 명시**

#### **[사용한 AI 모델]**

한국어 텍스트 인식 모델(GPT-5.6 Luna, Vision LLM / 주력 OCR — 실패 시 PaddleOCR PP-OCRv5 Korean으로 자동 폴백), 텍스트 분석 및 번역 모델(Groq Qwen3.6 27B / LLM), 보조 분석 모델(Vision Language Model / Multimodal LLM)

---

#### **[오픈소스 패키지]**

**Backend — 서버/인프라**

| 패키지 | 용도 |
| --- | --- |
| express | HTTP API 서버 프레임워크 |
| cors | 프론트엔드 origin 허용(CORS) 미들웨어 |
| express-rate-limit | API 요청 속도 제한 |
| zod | 요청 바디·환경변수 스키마 검증 |
| pino / pino-http / pino-pretty | 구조화 로깅(JSON) 및 개발용 포맷터 |
| dotenv | .env 환경변수 로드 |

**Backend — 데이터**

| 패키지 | 용도 |
| --- | --- |
| @supabase/supabase-js | Supabase Storage(서명 URL 발급/업로드) 클라이언트 |
| pg | 마이그레이션 실행 등 Postgres 직접 연결(node-postgres) |

**Backend — 이미지/OCR**

| 패키지 | 용도 |
| --- | --- |
| sharp | 이미지 크롭·리사이즈·블러·합성 전 과정(libvips 기반, 고성능) |
| paddleocr / paddlepaddle | 한글 포함 다국어 OCR 엔진 (Python) |
| pillow, numpy | Python 측 이미지 배열 처리(OCR 전처리용) |

**Backend — 테스트**

| 패키지 | 용도 |
| --- | --- |
| vitest | 단위/통합 테스트 러너 |
| supertest | Express 앱에 대한 HTTP 통합 테스트 |

**Frontend — 프레임워크**

| 패키지 | 용도 |
| --- | --- |
| react / react-dom | UI 라이브러리 |
| react-router-dom | 클라이언트 라우팅(대시보드/에디터 등 페이지 전환) |
| vite | 개발 서버·번들러 |
| typescript | 정적 타입 검사 |

**Frontend — UI/스타일**

| 패키지 | 용도 |
| --- | --- |
| tailwindcss / @tailwindcss/vite | 유틸리티 CSS 프레임워크 |
| lucide-react | 아이콘 세트 |

**Frontend — 기능**

| 패키지 | 용도 |
| --- | --- |
| jszip | 여러 번역 결과 PNG를 ZIP으로 묶어 일괄 다운로드 |

**Frontend — 품질**

| 패키지 | 용도 |
| --- | --- |
| oxlint | 고속 Rust 기반 린터 |

**공통**

| 패키지 | 용도 |
| --- | --- |
| tsx | 백엔드 dev 서버(TypeScript 즉시 실행/watch) |

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
# **[라이선스- 오픈소스 라이선스 명시]**
Apache License 2.0
[http://www.apache.org/licenses/](https://github.com/Linkshimcat/Glocalizer?tab=Apache-2.0-1-ov-file)
