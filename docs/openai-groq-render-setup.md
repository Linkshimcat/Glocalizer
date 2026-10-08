# OpenAI·Groq 실측 키와 Render 연결 안내

키 값을 채팅이나 GitHub에 올리지 않고, 로컬 백엔드와 Render 대시보드에 직접 입력하는 방법입니다.

## 1. 로컬 키 파일

키는 저장소 최상위가 아니라 백엔드 환경 파일에 둡니다.

```text
Glocalizer/
├── backend/.env.example  # 공유용 빈 템플릿
└── backend/.env          # 내 컴퓨터에서만 사용하는 실제 값
```

백엔드가 `dotenv/config`로 환경변수를 읽으므로 `backend/.env`에 설정합니다. `frontend/.env`에는 넣지 마세요. 프런트엔드 키는 브라우저에 노출될 수 있습니다.

터미널에서 백엔드 폴더로 이동해 파일을 엽니다.

```bash
cd /Users/linkcat/Developer/Glocalizer/backend
cp -n .env.example .env
open -e .env
```

`cp -n`은 기존 `.env`가 있으면 덮어쓰지 않습니다. 파일에 아래 항목을 찾아 발급받은 값을 입력하고 저장하세요.

```dotenv
OPENAI_API_KEY=여기에_OpenAI_키
GROQ_API_KEY=여기에_Groq_키
```

실제 값은 이 문서에 쓰거나 채팅에 붙이지 마세요. `.env`는 Git에서 제외됩니다.

## 2. 번역 비교 실측

같은 데이터에서 Groq 기준선과 OpenAI 변형을 소량 비교하려면 위 키를 저장한 뒤 `backend` 폴더에서 실행합니다.

```bash
npm run benchmark:translation -- --variants baseline,v1-gpt56 --limit 3
```

- `baseline`은 Groq를 사용합니다.
- `v1-gpt56`은 OpenAI를 사용합니다.
- 두 결과의 품질 평가는 OpenAI 심사 모델도 호출하므로 두 키가 모두 필요하고 OpenAI 사용 비용이 발생합니다. 처음에는 `--limit 3`처럼 작은 수로 시작하세요.
- 결과 JSON과 호출 캐시는 `backend/benchmarks/translation/results/` 아래에 저장됩니다. 같은 변형을 다시 실행하면 기존 번역 캐시를 재사용할 수 있습니다.

## 3. Render 계정과 GitHub 저장소 연결

현재 `render.yaml`은 Render의 백엔드 API 서비스 하나를 정의합니다. 서비스 이름은 `glocalizer-api`이고, 코드 위치는 `backend/`입니다. 프런트엔드는 이 Blueprint에 포함되어 있지 않습니다.

1. Glocalizer를 관리할 Render 계정으로 [Render Dashboard](https://dashboard.render.com/)에 로그인합니다.
2. Render의 **Account Settings → Account Security → Git Deployment Credentials → Add credential**에서 GitHub를 선택하고 연결을 승인합니다.
3. GitHub의 Render 앱 설정에서 `Linkshimcat/Glocalizer` 저장소에 접근할 수 있는지 확인합니다.
4. Render에서 **+ New → Blueprint**를 선택하고 `Linkshimcat/Glocalizer` 저장소를 연결합니다.
5. Blueprint 이름을 정하고 브랜치는 `main`, Blueprint 경로는 저장소 루트의 `render.yaml`로 지정합니다.
6. 변경 미리보기에 `glocalizer-api` 한 개가 표시되는지 확인합니다. **Deploy Blueprint**를 누르면 새 API 서비스가 생성되고 배포가 시작됩니다.

GitHub 연결만으로 Render 서비스가 생기지는 않습니다. Blueprint 배포가 실제 서비스 생성 단계이므로, 누르기 전에 대상 Render 계정과 플랜을 확인하세요.

## 4. 첫 배포 환경변수

현재 `render.yaml`에서 `sync: false`로 선언한 값은 첫 Blueprint 생성 과정에서 입력을 요청합니다. OpenAI와 Groq 키도 이때 입력할 수 있습니다. 이 파일에는 실제 키를 적지 않습니다.

첫 기동에는 AI 키 외에도 기존 서비스 설정이 필요합니다.

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `FRONTEND_ORIGIN`에는 허용할 프런트엔드 주소
- Blueprint에서 자동 생성하는 `PROJECT_TOKEN_SECRET`, `DOWNLOAD_STATS_API_KEY`, `JWT_SECRET`

`DATABASE_URL`은 마이그레이션 작업에 사용됩니다. Naver·OGQ 키는 각각 해당 연동 기능을 쓸 때 설정하면 됩니다. 필수 Supabase 값이 준비되지 않았다면, Blueprint만 만들어도 API가 정상 기동하지 않을 수 있습니다.

서비스가 만들어진 뒤 키를 추가하거나 바꿀 때는 Render에서 **glocalizer-api → Environment → Add Environment Variable**로 이동해 `OPENAI_API_KEY`와 `GROQ_API_KEY`를 입력하고 저장·배포합니다. 기존 Blueprint에 `sync: false` 항목을 나중에 추가해도 입력 창이 다시 뜨지 않으므로 대시보드에서 직접 설정하세요.

배포 후 서비스의 다음 주소가 정상 응답하는지 확인합니다.

```text
https://<Render 서비스 주소>/api/v1/health/ready
```

## 공식 안내

- [Render에 Git 제공자 연결하기](https://render.com/docs/git-provider)
- [Render Blueprints](https://render.com/docs/infrastructure-as-code)
- [Render 환경변수와 비밀값](https://render.com/docs/configure-environment-variables)
