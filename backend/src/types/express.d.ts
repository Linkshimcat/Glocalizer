import type { UserRow } from './user.js';
import type { ProjectRow } from './project.js';

declare global {
  namespace Express {
    interface Request {
      id: string;
      project?: ProjectRow;
      auth?: { sub: string };
      account?: UserRow;
      /** 현재 토큰의 user_sessions 행 id. 기기별 세션 도입 이전 토큰이면 없다. */
      sid?: string;
    }
  }
}

export {};
