import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

export function generateProjectToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashProjectToken(token: string): string {
  return createHmac('sha256', env.PROJECT_TOKEN_SECRET).update(token).digest('hex');
}

/** 저장된 hash와의 인증 비교도 고정 시간으로 수행해 token prefix 일치 여부가 드러나지 않게 한다. */
export function verifyProjectToken(token: string, expectedHash: string): boolean {
  const actualHash = hashProjectToken(token);
  const actual = Buffer.from(actualHash, 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
