// 테스트 중에는 pino 로그가 매 요청마다 콘솔을 채우는 걸 막는다.
process.env.LOG_LEVEL = 'silent';
process.env.SUPABASE_URL ??= 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY ??= 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key';
process.env.PROJECT_TOKEN_SECRET ??= 'test-project-token-secret';
