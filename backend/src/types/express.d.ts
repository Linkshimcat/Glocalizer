import type { ProjectRow } from './project.js';

declare global {
  namespace Express {
    interface Request {
      id: string;
      project?: ProjectRow;
    }
  }
}

export {};
