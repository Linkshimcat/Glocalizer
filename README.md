# NAVER OGQ PROJECT 

<h2>Glocalizer</h2>

> **Global + Localizer = 가장 로컬적인 것을 가장 글로벌하게 만들어주는 도구**
>
> K-웹툰과 캐릭터 중심의 K-콘텐츠가 글로벌 시장에서 급격히 성장함에 따라, 국내 1인 창작자들의 해외 플랫폼 진출 수요와 마켓 성장 기회가 그 어느 때보다 확대되고 있는 사회적 흐름에 발맞추어 개발된 AI 기반 이모티콘 로컬라이징 솔루션입니다.

<h3>문제정의</h3> <hr>

#### 1. 문화적 번역의 장벽
* **찰진 대사의 소실**: 한국어 이모티콘의 핵심은 특유의 위트와 찰진 대사이지만, 기존 기계 번역기를 사용하면 딱딱하고 어색하게 직역되어 본래의 맛과 감성이 현저히 떨어집니다.
* **현지 트렌드 반영의 한계**: 해외 마켓의 실시간 유행어나 슬랭에 맞춰 자연스럽게 번역하기엔 개인이 수집하고 가공할 수 있는 정보가 턱없이 부족하다는 것이 큰 문제입니다.

#### 2. 번거로운 그래픽 수정 작업
* **지루한 그래픽 노가다**: 글씨를 외국어로 바꾸려면 원래 이모티콘 이미지에서 한국어 텍스트 영역을 일일이 지우고, 비어버린 배경을 포토샵으로 직접 복원한 뒤, 새로운 텍스트를 얹어야 합니다.
* **소규모 창작자의 진입 장벽**: 전문 디자이너가 없는 1인 작가나 소규모 팀에게 이러한 이모티콘 레이어 수정 작업은 엄청난 시간 낭비이자 글로벌 시장 진입을 주저하게 만드는 거대한 장벽입니다.

---

#### 💡 해결 방안 (Glocalizer의 가치)
* **원클릭 배경 복원 및 텍스트 분리**: 사용자가 이미지를 업로드하고 클릭 한 번만 하면, AI가 이미지 속 글자의 위치를 정확히 탐지하고 글자 뒤에 가려져 있던 캐릭터나 배경을 자연스럽게 복원하여 채워 넣습니다.
* **초월 번역**: 타겟 국가의 최신 인터넷 밈, 신조어, 유행어를 학습한 LLM을 활용해 한국어 원문의 미묘한 뉘앙스를 현지 청소년들이 실제로 사용하는 가장 찰진 표현으로 치환합니다.
* **자동 폰트 합성 및 렌더링**: 현지 이모티콘 마켓에서 선호되는 귀엽고 개성 있는 무료 폰트를 매칭하고, 원본 이미지의 구도와 조화를 이루도록 텍스트를 자연스럽게 얹어 최종 완성본을 제공합니다.

<h3>아키텍쳐</h3> <hr>

#### 🔄 데이터 및 서비스 흐름 (Data & Service Flow)

* **Client (Frontend)**: 한국어 이모티콘 이미지 업로드 및 캐릭터 성격 설정 -> 실시간 AI 파이프라인 진행 상태 확인 -> 최적의 현지 밈(Meme) 대사가 합성된 결과물 미리보기 후 다운로드
* **Server (Backend)**: 클라이언트가 업로드한 이미지 버퍼 처리 및 Supabase 프로젝트 데이터 연동 -> 비동기 OCR·번역·원문 제거 파이프라인 제어
* **AI Pipeline**:
  * **PaddleOCR**로 한글 대사 영역의 텍스트·좌표·신뢰도를 검출
  * **Groq LLM**이 언어별 밈형 번역 후보 3개와 최적 후보·권장 스타일을 생성
* **Database (Supabase)**: 오리지널 이미지 및 번역 가공된 결과 이미지 파일의 스토리지 주소 저장 -> 프로젝트 이력 및 사용자의 이모티콘 편집 프리셋 데이터 실시간 관리

<h3>사용 스택</h3> <hr>

| 분류 | 기술 스택 |
| :--- | :--- |
| **Backend** | Node.js (v22+) , TypeScript, Express.js, supabase |
| **Frontend** | React + Vite + TypeScript + TailWind CSS |
| **Design** | Figma / Claude Design |
| **IDE / Tool** | VS Code, Claude Code CLI, Vercel, GitHub |

<h3>실행방법</h3> <hr>

```bash
# 1. 저장소 복제
git clone https://github.com/Linkshimcat/Glocalizer.git
cd Glocalizer

# 2. 환경변수 설정
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Backend 의존성 및 PaddleOCR 설치
cd backend
npm ci
python3 -m pip install --user -r python/requirements.txt

# 4. backend/.env에 Supabase, GROQ_API_KEY, PROJECT_TOKEN_SECRET을 입력한 뒤 연결 확인
npm run db:check

# 5. migration 적용 (DATABASE_URL은 Supabase Dashboard → Connect → Session Pooler URI 사용)
# direct DB 주소는 WSL/IPv6 환경에서 ENETUNREACH가 날 수 있습니다.
npm run db:migrate
npm run dev

# 6. 별도 터미널에서 Frontend 실행
cd frontend && npm ci && npm run dev
```

### 배포 전 확인

- `DATABASE_URL`에는 Supabase **Session Pooler** 연결 URI를 사용합니다. 이 프로젝트는 Singapore pooler를 사용하며, Dashboard의 Connect 화면에서 복사한 URI를 그대로 입력합니다. 이 값은 migration 실행에만 필요하며 browser 환경변수에 넣지 않습니다.
- `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `PROJECT_TOKEN_SECRET`은 backend/Render 환경변수에만 넣습니다. `VITE_` 접두사로 노출하면 안 됩니다.
- Supabase Storage bucket은 private으로 유지하고, Storage CORS에 실제 frontend 도메인을 허용합니다.
- 배포 전에 `npm run db:migrate`, `npm run db:check`, `npm test`, `npm run build`를 실행합니다. 현재 job migration은 `012_enforce_one_active_job_per_project.sql`까지입니다.
- frontend 배포 환경에서는 `VITE_API_BASE_URL=https://<backend-domain>/api/v1`을 설정하고 backend의 `FRONTEND_ORIGIN`에는 실제 frontend 주소를 설정합니다.
- Render는 `DATABASE_URL`이 설정된 경우 deploy 직전에 `npm run db:migrate:production`을 실행합니다. `012_enforce_one_active_job_per_project.sql`까지 적용된 뒤 readiness endpoint가 DB·Storage를 확인합니다.
- 배포 뒤 실제 PNG/JPG 한 장으로 전체 흐름을 확인하려면 `SMOKE_IMAGE_PATH=/absolute/path/sample.jpg npm run smoke:e2e`를 실행합니다. 언어 조합은 `SMOKE_TARGET_LANGUAGES=en,ja,zh`로 검증할 수 있습니다. 이 스크립트는 임시 프로젝트를 완료 후 삭제하며 API token을 출력하지 않습니다.
