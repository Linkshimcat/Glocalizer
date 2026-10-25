# TossPayments 테스트 결제

Glocalizer는 TossPayments SDK v2 결제창형 결제를 공모전 가상 결제에 사용합니다. `creator` 상품은 ₩9,900 1회 결제로 30일 이용하며, 정기결제·자동결제는 없습니다. `test_gck_`와 `test_gsk_` 키만 허용하고 실제 금액은 청구되지 않습니다.

## 환경변수

- 로컬 프론트엔드 `frontend/.env`: `VITE_TOSS_CLIENT_KEY=test_gck_...`
- 결제수단을 제한한 Toss 결제 UI를 만들었다면 `VITE_TOSS_VARIANT_KEY`에 해당 `variantKey`를 설정합니다. UI에는 Toss Pay·카카오페이·네이버페이만 활성화하고, 미설정 시 `DEFAULT`를 사용합니다.
- 로컬 백엔드 `backend/.env`: `TOSS_CLIENT_KEY=test_gck_...`, `TOSS_SECRET_KEY=test_gsk_...`
- Vercel: 같은 테스트 `VITE_TOSS_CLIENT_KEY`를 프로젝트 환경변수에 설정하고 재배포해야 새 빌드에 반영됩니다.
- Render: 같은 키 세트의 `TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY`와 `FRONTEND_ORIGIN=https://glocalizer.vercel.app`을 설정합니다. 시크릿 키는 Vercel에 설정하지 않습니다.
- 로컬 CORS는 기존대로 `http://localhost:5173`을 허용합니다. 배포 도메인은 Render의 `FRONTEND_ORIGIN`과 정확히 일치해야 합니다.

키가 비어 있으면 결제가 비활성화되고, 라이브 키 접두사는 서버 환경 검증에서 거부됩니다. 키 값은 저장소, 프론트 번들, 문서에 커밋하지 않습니다.

## 로컬 실행

1. Supabase에 `supabase/migrations/20261020010000_payments.sql`과 `20261025010000_toss_payment_confirmation.sql`을 순서대로 적용합니다.
2. `cd backend && npm run db:check`로 데이터베이스 준비 상태를 확인합니다.
3. 백엔드와 프론트엔드를 실행하고 로그인한 뒤 `/pricing`에서 “테스트 결제 시작”을 선택합니다.
4. `테스트 결제하기`를 눌러 결제창을 열고, 결제창에서 제공하는 테스트 결제수단과 약관을 확인한 뒤 테스트 결제를 완료합니다. 문서용 테스트 키에서 지원되지 않는 결제수단은 표시되지 않을 수 있습니다.
5. `payments.status`가 `pending → processing → done`으로 바뀌고, 주문 소유 사용자에게 30일 이용기간이 반영되는지 확인합니다.
6. 취소·실패, 다른 계정의 주문, 금액 변조, 동일 성공 URL 재호출과 동시 승인에서 중복 멤버십이 부여되지 않는지 확인합니다.

## 저장 및 복구

서버는 승인 전에 주문 소유권·저장 금액·상태를 확인하고, Toss API 승인/조회는 백엔드에서만 호출합니다. 주문 행 잠금으로 같은 주문의 동시 승인을 제한하며, 승인된 결제 저장과 멤버십 부여는 한 DB 트랜잭션에서 처리합니다. 승인 응답을 받았지만 저장이 실패한 경우, 같은 성공 URL 재시도는 Toss 결제 조회 후 아직 완료되지 않은 저장 작업을 복구합니다.

테스트 결제는 로컬 또는 승인된 테스트 환경에서만 확인합니다. 이 저장소의 설정으로 라이브 키를 사용할 수 없으며 운영 배포나 실제 결제 전환 절차는 포함하지 않습니다.
