# Google 로그인 설정

Glocalizer는 Google 계정의 본인 확인에만 Supabase Auth를 사용합니다. 프론트엔드에서 Google Identity Services(GIS)로 ID 토큰을 직접 받아 `supabase.auth.signInWithIdToken`으로 세션을 발급받고, 백엔드가 그 세션을 검증해 `public.users`의 기존 계정과 연결하거나 새 계정을 생성한 뒤 현재 사용 중인 Glocalizer JWT를 발급합니다.

리다이렉트 방식(`signInWithOAuth`)이 아니라 ID 토큰 방식을 쓰는 이유는, 리다이렉트 방식은 로그인 도중 Google 화면에 Supabase 콜백 도메인(`<project-ref>.supabase.co`)이 그대로 노출되기 때문입니다. GIS 방식은 페이지 이동 없이 팝업으로 처리되어 우리 서비스 도메인만 보입니다. Supabase Custom Domains(유료) 없이도 브랜딩 노출 문제를 해결할 수 있습니다.

## Google Cloud 설정

1. Google Auth Platform에서 웹 애플리케이션용 OAuth 클라이언트를 생성합니다.
2. 승인된 JavaScript 원본에 다음 주소를 추가합니다.
   - `http://localhost:5173`
   - `https://glocalizer.vercel.app`
3. **Supabase Dashboard → Authentication → Providers → Google**에 표시되는 Supabase 콜백 URL을 승인된 리디렉션 URI에 추가합니다(ID 토큰 로그인 자체에는 쓰이지 않지만, Supabase가 프로바이더 설정 검증에 요구합니다). 주소 형식은 `https://<project-ref>.supabase.co/auth/v1/callback`입니다.
4. OAuth 동의 화면의 범위에 `openid`, 이메일, 프로필을 설정합니다.
5. 만든 OAuth 클라이언트의 **클라이언트 ID**(`*.apps.googleusercontent.com`, 공개값)를 복사해둡니다 — 프론트엔드 환경변수에 사용합니다.

## Supabase Dashboard 설정

1. **Authentication → Providers → Google**로 이동합니다.
2. Google 로그인을 활성화하고 Google Client ID와 Client Secret을 입력합니다.
3. **Authentication → URL Configuration**에서 실제 서비스 주소를 Site URL로 등록합니다(ID 토큰 로그인은 브라우저 안에서 완결되므로 별도 콜백 리디렉션 주소는 필요 없습니다).

## 프론트엔드 환경변수

다음 값을 로컬 환경(`frontend/.env`)과 Vercel 환경변수에 각각 등록합니다. 셋 다 브라우저에 공개해도 되는 설정값입니다. `service_role` 키 또는 secret 키는 절대 프론트엔드에 넣으면 안 됩니다.

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
VITE_GOOGLE_CLIENT_ID=<google-oauth-client-id>.apps.googleusercontent.com
```

## 데이터베이스 적용

운영 환경에서 Google 로그인 버튼을 활성화하기 전에 `supabase/migrations/20260919120001_add_google_auth_identity.sql` 마이그레이션을 적용합니다.
