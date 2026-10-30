import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

/** 이메일로 보내는 "내 데이터 받기" 링크의 유효 시간 */
export const EXPORT_TOKEN_TTL_SECONDS = 24 * 60 * 60;

const UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const PURPOSE = 'data-export';

// 로그인 토큰과 같은 JWT_SECRET을 쓰되 용도별 키를 따로 유도한다. 형식(조각 2개)과 키가 모두 달라
// 링크 토큰을 로그인 토큰으로, 로그인 토큰을 링크 토큰으로 쓸 수 없다.
const key = () => createHmac('sha256', env.JWT_SECRET).update(`glocalizer:${PURPOSE}:v1`).digest();
const sign = (body: string) => createHmac('sha256', key()).update(body).digest('base64url');

export interface ExportTokenPayload {
  sub: string;
  /** 발급 시점의 users.session_version. 비밀번호 변경·다른 기기 로그아웃으로 바뀌면 링크가 무효가 된다. */
  ver: number;
}

export function signExportToken(payload: ExportTokenPayload, ttlSeconds = EXPORT_TOKEN_TTL_SECONDS): string {
  const body = Buffer.from(JSON.stringify({ ...payload, purpose: PURPOSE, exp: Math.floor(Date.now() / 1000) + ttlSeconds })).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function verifyExportToken(token: string): ExportTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, signature] = parts as [string, string];
  const actual = Buffer.from(signature);
  const expected = Buffer.from(sign(body));
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload?.purpose !== PURPOSE || !Number.isSafeInteger(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    if (typeof payload.sub !== 'string' || !UUID_PATTERN.test(payload.sub)) return null;
    if (!Number.isSafeInteger(payload.ver) || payload.ver < 0) return null;
    return { sub: payload.sub, ver: payload.ver };
  } catch {
    return null;
  }
}
