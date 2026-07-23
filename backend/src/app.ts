import cors from 'cors';
import express from 'express';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorMiddleware, notFoundHandler } from './middleware/error.middleware.js';
import { rateLimitMiddleware } from './middleware/rate-limit.middleware.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import { apiRouter } from './routes/index.js';

export function createApp() {
  const app = express();
  const allowedOrigins = new Set([env.FRONTEND_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173']);

  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      redact: {
        paths: ['req.headers.x-project-token', 'req.headers.authorization'],
        censor: '[REDACTED]',
      },
      genReqId: (req) => (req as express.Request).id,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );
  app.use(
    cors({
      origin(origin, callback) {
        // 브라우저가 아닌 health check 등 origin 없는 요청도 허용한다.
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('허용되지 않은 frontend origin입니다.'));
      },
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/v1', rateLimitMiddleware, apiRouter);

  app.use(notFoundHandler);
  app.use(errorMiddleware);

  return app;
}
