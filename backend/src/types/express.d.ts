import type { UserRow } from './user.js';
import type { ProjectRow } from './project.js';

declare global {
  namespace Express {
    interface Request {
      id: string;
      project?: ProjectRow;
      auth?: { sub: string };
      account?: UserRow;
    }
  }
}

export {};
