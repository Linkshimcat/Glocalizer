import sharp from 'sharp';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import {
  findUserByEmail,
  findUserById,
  findUserByNaverId,
  insertEmailUser,
  insertNaverUser,
  linkNaverProfile,
  updateUserProfile,
} from '../repositories/user.repository.js';
import type { LoginInput, SignupInput, UpdateProfileInput } from '../schemas/auth.schema.js';
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
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatar_url,
    // 이메일 계정에 네이버를 나중에 연결할 수 있으므로, 비밀번호 존재 여부로 최초 가입 방식을 판별한다.
    signupMethod: user.password_hash ? 'email' : 'naver',
  };
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

const AVATAR_SIZE = 256;

/** 업로드된 이미지를 256px 정사각형 WebP로 다시 인코딩해 data URL로 저장한다.
 *  재인코딩으로 메타데이터/비정상 페이로드를 제거하고, DB에 들어가는 크기를 수십 KB로 묶는다. */
async function normalizeAvatar(dataUrl: string): Promise<string> {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  try {
    const webp = await sharp(Buffer.from(base64, 'base64'), { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();
    return `data:image/webp;base64,${webp.toString('base64')}`;
  } catch {
    throw new AppError('IMAGE_DECODE_FAILED');
  }
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
  const user = await findUserById(userId);
  if (!user) throw new AppError('UNAUTHORIZED');

  const avatarUrl = input.avatar === undefined || input.avatar === null ? input.avatar : await normalizeAvatar(input.avatar);
  return toPublicUser(await updateUserProfile(userId, { name: input.name, avatarUrl }));
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
  const name = profile.name ?? null;
  const avatarUrl = profile.profile_image ?? null;

  // naver_id로 먼저 찾고(재로그인), 없으면 같은 이메일로 가입된 계정이 있는지 확인해 연결한다.
  // email에도 UNIQUE 제약이 있어서, 이 순서 없이 바로 insert/upsert(naver_id)만 하면 이메일
  // 회원가입 계정과 이메일이 겹치는 순간 제약 위반으로 로그인 자체가 실패한다.
  let user = await findUserByNaverId(profile.id);
  if (user) {
    user = await linkNaverProfile(user.id, {
      naverId: profile.id,
      name: user.name_customized ? undefined : name,
      avatarUrl: user.avatar_customized ? undefined : avatarUrl,
    });
  } else {
    const existingByEmail = profile.email ? await findUserByEmail(profile.email) : null;
    user = existingByEmail
      ? await linkNaverProfile(existingByEmail.id, {
          naverId: profile.id,
          name: existingByEmail.name_customized ? undefined : name ?? existingByEmail.name,
          avatarUrl: existingByEmail.avatar_customized ? undefined : avatarUrl ?? existingByEmail.avatar_url,
        })
      : await insertNaverUser({ naverId: profile.id, email: profile.email ?? null, name, avatarUrl });
  }

  return { token: signAuthToken({ sub: user.id }), user: toPublicUser(user) };
}
