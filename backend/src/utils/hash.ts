import { createHmac, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

export function generateProjectToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashProjectToken(token: string): string {
  return createHmac('sha256', env.PROJECT_TOKEN_SECRET).update(token).digest('hex');
}
