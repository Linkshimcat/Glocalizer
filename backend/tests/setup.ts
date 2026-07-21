// 테스트 중에는 pino 로그가 매 요청마다 콘솔을 채우는 걸 막는다.
process.env.LOG_LEVEL = 'silent';
