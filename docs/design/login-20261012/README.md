# Glocalizer login redesign

2026-10-12. 대상은 기존 `/login` 페이지의 UI/UX다. 별도 참고 이미지는 첨부되지 않아 요청서의 중앙 카드, 저채도 Blue/Mint 수채화, 도트 지도와 다국어 인사말을 디자인 기준으로 사용했다. [배포 로그인 화면](https://glocalizer.vercel.app/login)과 현재 로컬 화면을 브라우저에서 확인했다.

## 구현 분석

| 항목 | 기존 구현과 이번 작업 |
| --- | --- |
| 페이지·라우팅 | `src/pages/Login.tsx`, `App.tsx`의 지연 로딩 `/login` 경로. 경로와 `next` 복귀 규칙 유지 |
| 공통 구성 | `Header`, `Button`, `StateNotice`, `GoogleIcon`, `NaverIcon`, `Toast` 재사용. Header는 변경하지 않음 |
| 스타일 | React·TypeScript·Vite·Tailwind와 기존 CSS. 로그인 전용 `login.css`를 추가하고 기존 로그인 카드 스타일 한 줄을 이관 |
| 디자인 토큰 | Pretendard 계열 폰트, Ink `#191f28`, Sub `#56616e`, CTA Green `#15803d`, Control 6px·Dialog 12px 사용 |
| 이메일 인증 | `AuthContext`의 로그인·회원가입, 기존 `/auth/login`·`/auth/signup` API와 세션 저장 유지. 이메일·비밀번호 필수, 가입 비밀번호 8자 이상, 이름 선택·최대 60자·공백 정리 규칙 유지 |
| Google | 기존 GIS 준비·버튼 클릭 → nonce를 사용하는 Supabase ID 토큰 교환 → `/auth/google` 흐름 유지. 준비·처리 중 상태를 기존 상태 값으로 표시 |
| Naver | 기존 authorize URL, UUID state, 복귀 경로 저장과 `NaverCallback` 검증 유지. 미설정 안내의 한국어 하드코딩만 4개 언어 번역으로 교체 |
| 다국어 | `LanguageContext`, `translations.ts`, `legalUi`의 한국어·영어·일본어·중국어 구조 유지. 새 안내·로딩·비밀번호 표시 문구를 4개 언어로 추가 |

## 디자인과 사용성

- 카드 최대 너비는 440px이고 모든 화면에서 수평 중앙에 위치한다. 페이지 최소 높이는 `100dvh`에서 Header 높이를 빼 모바일 브라우저의 가용 높이에 대응한다. 높이 850px 이하에서는 바깥 여백과 카드 내부 간격을 줄이고, 760px 이하에서는 여백을 한 번 더 조절한다. 입력창과 버튼 크기는 유지하며, 회원가입·오류·키보드 등으로 높이가 부족하면 콘텐츠 전체를 자연스럽게 스크롤할 수 있다.
- 흰색 카드에 1px 테두리, 기존 12px 모서리 토큰과 약한 그림자를 적용했다. 제목·설명·전환·이메일 입력·주요 버튼·소셜 인증 순서를 유지했다.
- 입력과 인증 버튼의 기본 높이는 48px, 다른 폼 버튼의 터치 높이는 최소 44px이다. 입력 글자는 16px로 모바일 입력 편의성을 유지한다.
- Green CTA에 집중하도록 Google/Naver 버튼은 같은 흰색 테두리 스타일로 맞추고 각 서비스의 로고 색을 사용했다.
- `AuthBackdrop`은 정적인 SVG 수채화, 로컬 도트 지도, 얇은 연결선과 작은 인사말 네 개로 구성했다. 지도는 [Natural Earth의 공개 도메인 데이터](https://www.naturalearthdata.com/about/terms-of-use/)를 단일 17KB SVG 경로로 줄였다. 런타임 지도 연산과 외부 이미지 핫링크가 없다.
- 태블릿에서는 인사말 두 개만 표시하고, 모바일에서는 지도와 인사말을 숨긴다. 배경은 `aria-hidden`, `inert`, `pointer-events: none`으로 폼 입력과 키보드 포커스에 참여하지 않는다.
- 비밀번호 표시·숨기기, 자동완성, 이메일 키보드 설정, 가입 화면 제목·설명, 필드와 오류 메시지의 연결을 추가했다. 인증 처리 중에는 관련 폼 버튼을 비활성화한다.
- 장식에는 애니메이션이 없다. 컨트롤의 전환은 180ms이며 Reduced Motion에서는 전환과 로딩 회전도 제거한다.
- 카드 아래에는 기존 경로와 번역을 사용하는 홈·개인정보처리방침·이용약관 링크를 배치했다.

## 검증

| 결과 | 검사 |
| --- | --- |
| 통과 | 프론트엔드 TypeScript·클라이언트·SSR 빌드와 공개 경로 6개의 사전 렌더링 |
| 통과 | Lint 오류 없음. 작업 전부터 있던 경고 6개 유지 |
| 통과 | 320·390·768·1024·1440px × 4개 언어 × 로그인/회원가입 = 40개 조합 |
| 통과 | 1366×768·1280×720·1440×800·375×812·390×844 × 4개 언어 = 20개 조합에서 세로 스크롤 없이 카드와 하단 링크 전체 표시 |
| 통과 | 카드 수평 중앙 정렬, Header 유지, 가로 넘침 없음, 말풍선과 카드 겹침·장식의 입력 차단 없음 |
| 통과 | 키보드만으로 입력·비밀번호 표시·로그인, 명확한 포커스, Reduced Motion |
| 통과 | 원래 이메일·가입 API 본문, 네이티브 이메일·가입 비밀번호 검증, 이름 공백 정리 |
| 통과 | 오류 읽기·필드 연결·전환 시 초기화, 로딩·버튼 비활성화, 입력 값 보존 |
| 통과 | 모의 GIS·Supabase 토큰 교환·Google 백엔드 콜백과 원래 복귀 URL |
| 통과 | 모의 Naver authorize 파라미터·복귀, 올바른 state 통과와 잘못된 state 거부 |
| 통과 | 기존 세션 200·401·503 및 재시도, 외부 복귀 URL 거부 |
| 통과 | 높이 420px의 모바일 화면에서도 로그인·회원가입의 비밀번호 입력, 소셜 버튼과 하단 링크에 스크롤로 접근 |
| 통과 | 주요 CTA 5.02:1, 설명 6.30:1, 입력 placeholder 4.59:1, 하단 링크 5.97:1의 계산된 색상 대비 |
| 미검증 | 실제 Google/Naver 계정 로그인 및 운영 API 인증. 로컬 OAuth 설정값과 테스트 계정이 제공되지 않아 모의 응답으로 회귀 검사함 |

브라우저 캡처를 직접 확인해 초기 페인트 크기와 카드의 세로 간격을 줄였다. 캡처·기하 검사·키보드 검사는 Chromium 기반이며, 전체 접근성 표준 준수 인증을 의미하지 않는다.

회귀 검사는 기존 의존성인 Playwright로 실행한다. 별도 테스트 서버에는 가짜 OAuth 공개 설정만 주입하고 GIS·Supabase·API 응답을 가로채므로 실제 계정 생성·인증이나 유료 요청이 없다. 테스트 서버는 종료 시 정리한다.

```bash
cd frontend
npm run build
npm run lint
PREVIEW_URL=http://127.0.0.1:5174 npm run check:login
```

`check:login`의 기본 대상은 실행 중인 로컬 개발 서버 `127.0.0.1:5173`이며, OAuth 검사용 서버는 기본 `5175`를 사용한다. `LOGIN_QA_PORT`로 검사 서버 포트를 바꿀 수 있다.

## 화면 자료

- [기존 로컬 화면 — PC](before-desktop.png)
- [새 로그인 — PC](login-desktop.png)
- [높이 조정 — 노트북 1366×768](login-laptop.png)
- [높이 조정 — PC 1280×720](login-short-desktop.png)
- [새 로그인 — 태블릿](login-tablet.png)
- [새 로그인 — 모바일](login-mobile.png)
- [새 회원가입 — 모바일](signup-mobile.png)
- [오류 안내 — 모바일](login-error-mobile.png)
- [검사 결과](checks.json)

로컬 원본 캡처와 Build/Lint/Test 로그: `/tmp/glocalizer-login-redesign/`.
