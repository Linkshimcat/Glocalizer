import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

const AUTH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30일 — 이메일/네이버 로그인 세션 유지 기간

export interface AuthTokenPayload {
  sub: string;
  ver?: number;
}

interface DecodedPayload extends AuthTokenPayload {
  ver: number;
  iat: number;
  exp: number;
}

function base64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function sign(headerAndPayload: string): string {
  return createHmac('sha256', env.JWT_SECRET).update(headerAndPayload).digest('base64url');
}

/** 세션 토큰을 자체 서명한다(HS256). 별도 JWT 라이브러리 없이 project-token과 같은
 *  HMAC 방식을 재사용해 의존성을 늘리지 않는다. */
export function signAuthToken(payload: AuthTokenPayload): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64url(JSON.stringify({ ...payload, ver: payload.ver ?? 0, iat: now, exp: now + AUTH_TOKEN_TTL_SECONDS }));
  const signature = sign(`${header}.${body}`);
  return `${header}.${body}.${signature}`;
}

export function verifyAuthToken(token: string): DecodedPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;

  const expectedSignature = sign(`${header}.${body}`);
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const metadata = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (!metadata || metadata.alg !== 'HS256' || metadata.typ !== 'JWT' || !payload) return null;
    if (!Number.isSafeInteger(payload.exp) || payload.exp <= now || !Number.isSafeInteger(payload.iat) || payload.iat > now) return null;
    if (typeof payload.sub !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(payload.sub)) return null;
    const version = payload.ver ?? 0;
    if (!Number.isSafeInteger(version) || version < 0) return null;
    return { ...payload, ver: version };
  } catch {
    return null;
  }
}
