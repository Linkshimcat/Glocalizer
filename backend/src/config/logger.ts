import pino from 'pino';
import { safeLogError } from '../utils/log-error.js';
import { env } from './env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  serializers: { err: safeLogError },
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
      : undefined,
});
