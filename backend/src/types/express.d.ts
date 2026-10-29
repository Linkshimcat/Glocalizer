import type { AuthUserRow } from '../repositories/user.repository.js';
import type { ProjectRow } from './project.js';

declare global {
  namespace Express {
    interface Request {
      id: string;
      project?: ProjectRow;
      auth?: { sub: string };
      /** 로그인 확인에 쓴 최소 컬럼만 있다. 프로필 전체가 필요하면 findUserById로 다시 읽는다. */
      account?: AuthUserRow;
      /** 현재 토큰의 user_sessions 행 id. 기기별 세션 도입 이전 토큰이면 없다. */
      sid?: string;
    }
  }
}

export {};
