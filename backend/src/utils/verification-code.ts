import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

/** 메일로 보내는 6자리 인증코드의 유효 시간 */
export const VERIFICATION_CODE_TTL_SECONDS = 10 * 60;

export const VERIFICATION_PURPOSES = ['delete-account', 'change-password'] as const;
export type VerificationPurpose = (typeof VERIFICATION_PURPOSES)[number];

export type VerificationResult = 'ok' | 'invalid' | 'expired';

/** 챌린지를 묶는 사용자 상태. 비밀번호를 바꾸거나 다른 기기를 로그아웃하면 이전 코드가 무효가 된다. */
export interface VerificationSubject {
  id: string;
  session_version?: number | null;
  password_hash?: string | null;
}

// DB에 코드를 저장하지 않는다. 서버만 아는 키로 서명한 챌린지를 브라우저가 들고 있다가 코드와 함께 돌려준다.
// 챌린지에는 코드 대신 코드의 HMAC만 들어 있어 키 없이는 코드를 알아낼 수 없다. 용도마다 키가 달라
// 탈퇴용 코드를 비밀번호 변경에 쓰거나 내보내기 링크 토큰으로 쓸 수 없다.
const key = (purpose: VerificationPurpose) => createHmac('sha256', env.JWT_SECRET).update(`glocalizer:verify:${purpose}:v1`).digest();
const mac = (purpose: VerificationPurpose, value: string) => createHmac('sha256', key(purpose)).update(value).digest('base64url');

const bindOf = (purpose: VerificationPurpose, user: VerificationSubject) => mac(purpose, `bind:${user.id}:${user.session_version ?? 0}:${user.password_hash ?? ''}`);
const codeMacOf = (purpose: VerificationPurpose, userId: string, code: string) => mac(purpose, `code:${userId}:${code}`);

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createVerificationChallenge(user: VerificationSubject, purpose: VerificationPurpose): { code: string; challenge: string } {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const body = Buffer.from(JSON.stringify({
    sub: user.id, purpose, bind: bindOf(purpose, user), code: codeMacOf(purpose, user.id, code),
    exp: Math.floor(Date.now() / 1000) + VERIFICATION_CODE_TTL_SECONDS,
  })).toString('base64url');
  return { code, challenge: `${body}.${mac(purpose, body)}` };
}

export function verifyVerificationCode(challenge: string, code: string, user: VerificationSubject, purpose: VerificationPurpose): VerificationResult {
  const parts = challenge.split('.');
  if (parts.length !== 2) return 'invalid';
  const [body, signature] = parts as [string, string];
  if (!safeEqual(signature, mac(purpose, body))) return 'invalid';
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload?.purpose !== purpose || payload.sub !== user.id || typeof payload.bind !== 'string' || typeof payload.code !== 'string') return 'invalid';
    if (!safeEqual(payload.bind, bindOf(purpose, user))) return 'invalid';
    if (!Number.isSafeInteger(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) return 'expired';
    return safeEqual(payload.code, codeMacOf(purpose, user.id, code)) ? 'ok' : 'invalid';
  } catch {
    return 'invalid';
  }
}
