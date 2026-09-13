import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import {
  findUserByEmail,
  findUserById,
  insertEmailUser,
  upsertNaverUser,
} from '../repositories/user.repository.js';
import type { LoginInput, SignupInput } from '../schemas/auth.schema.js';
import type { PublicUser, UserRow } from '../types/user.js';
import { signAuthToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

const NAVER_TOKEN_URL = 'https://nid.naver.com/oauth2.0/token';
const NAVER_PROFILE_URL = 'https://openapi.naver.com/v1/nid/me';

interface AuthResult {
  token: string;
  user: PublicUser;
}

function toPublicUser(user: UserRow): PublicUser {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatar_url };
}

export async function signup(input: SignupInput): Promise<AuthResult> {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new AppError('EMAIL_ALREADY_REGISTERED', { email: input.email });
  }

  const user = await insertEmailUser({
    email: input.email,
    passwordHash: hashPassword(input.password),
    name: input.name,
  });

  return { token: signAuthToken({ sub: user.id }), user: toPublicUser(user) };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await findUserByEmail(input.email);
  if (!user || !user.password_hash || !verifyPassword(input.password, user.password_hash)) {
    throw new AppError('INVALID_CREDENTIALS');
  }

  return { token: signAuthToken({ sub: user.id }), user: toPublicUser(user) };
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await findUserById(userId);
  if (!user) throw new AppError('UNAUTHORIZED');
  return toPublicUser(user);
}

interface NaverTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface NaverProfileResponse {
  resultcode?: string;
  message?: string;
  response?: { id: string; email?: string; name?: string; profile_image?: string };
}

/** authorization code(프론트에서 네이버 로그인 팝업으로 받은 값)를 access token으로 교환하고,
 *  프로필을 조회해 계정을 생성/갱신한다. redirect_uri는 네이버 토큰 API에서 요구하지 않는다. */
export async function loginWithNaver(code: string, state: string): Promise<AuthResult> {
  if (!env.NAVER_CLIENT_ID || !env.NAVER_CLIENT_SECRET) {
    throw new AppError('NAVER_NOT_CONFIGURED');
  }

  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.NAVER_CLIENT_ID,
    client_secret: env.NAVER_CLIENT_SECRET,
    code,
    state,
  });

  const tokenResponse = await fetch(`${NAVER_TOKEN_URL}?${tokenParams.toString()}`);
  const tokenJson = (await tokenResponse.json().catch(() => ({}))) as NaverTokenResponse;
  if (!tokenResponse.ok || !tokenJson.access_token) {
    throw new AppError('NAVER_LOGIN_FAILED', { cause: tokenJson.error_description ?? tokenJson.error });
  }

  const profileResponse = await fetch(NAVER_PROFILE_URL, {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const profileJson = (await profileResponse.json().catch(() => ({}))) as NaverProfileResponse;
  if (!profileResponse.ok || profileJson.resultcode !== '00' || !profileJson.response) {
    throw new AppError('NAVER_LOGIN_FAILED', { cause: profileJson.message });
  }

  const profile = profileJson.response;
  const user = await upsertNaverUser({
    naverId: profile.id,
    email: profile.email ?? null,
    name: profile.name ?? null,
    avatarUrl: profile.profile_image ?? null,
  });

  return { token: signAuthToken({ sub: user.id }), user: toPublicUser(user) };
}
