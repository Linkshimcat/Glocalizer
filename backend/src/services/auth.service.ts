import sharp from 'sharp';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { supabase } from '../config/supabase.js';
import { AppError } from '../errors/app-error.js';
import { findProjectsByOwner } from '../repositories/project.repository.js';
import {
  deleteUserRow,
  findUserByEmail,
  findUserById,
  findUserByNaverId,
  findUserBySupabaseAuthId,
  insertEmailUser,
  insertGoogleUser,
  insertNaverUser,
  linkGoogleProfile,
  linkNaverProfile,
  updateUserPassword,
  updateUserProfile,
} from '../repositories/user.repository.js';
import type { ChangePasswordInput, GoogleLoginInput, LoginInput, SignupInput, UpdateProfileInput } from '../schemas/auth.schema.js';
import type { PublicUser, UserRow } from '../types/user.js';
import { signAuthToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { deleteGenerationsByOwner } from './generation.service.js';
import { deleteProjectAndAssets } from './project.service.js';

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
    signupMethod: user.signup_method,
    hasPassword: user.password_hash !== null,
    hasNaver: user.naver_id !== null,
    hasGoogle: user.supabase_auth_id !== null,
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

export async function changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
  const user = await findUserById(userId);
  if (!user) throw new AppError('UNAUTHORIZED');
  if (!user.password_hash) throw new AppError('PASSWORD_CHANGE_UNAVAILABLE');
  if (!verifyPassword(input.currentPassword, user.password_hash)) {
    throw new AppError('CURRENT_PASSWORD_INCORRECT');
  }

  await updateUserPassword(userId, hashPassword(input.newPassword));
}

/** 현지화 프로젝트·생성 결과의 Storage 파일부터 지운 뒤 계정 행을 지운다 — 순서를 바꾸면
 *  users 행 삭제가 먼저 FK cascade로 projects/generation_projects를 지워버려 Storage 파일이
 *  고아로 남는다. Google 연동 계정이면 Supabase Auth 사용자도 함께 정리한다. */
export async function deleteAccount(userId: string): Promise<void> {
  const user = await findUserById(userId);
  if (!user) throw new AppError('UNAUTHORIZED');

  const projects = await findProjectsByOwner(userId);
  for (const project of projects) {
    await deleteProjectAndAssets(project.id);
  }

  await deleteGenerationsByOwner(userId);

  if (user.supabase_auth_id) {
    const { error } = await supabase.auth.admin.deleteUser(user.supabase_auth_id);
    if (error) logger.warn({ err: error, userId }, 'Supabase Auth 사용자 삭제 실패 (앱 계정 삭제는 계속 진행)');
  }

  await deleteUserRow(userId);
}

function identityString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function loginWithGoogle(input: GoogleLoginInput): Promise<AuthResult> {
  const { data, error } = await supabase.auth.getUser(input.accessToken);
  const authUser = data.user;
  const googleIdentity = authUser?.identities?.find((identity) => identity.provider === 'google');
  const email = authUser?.email?.trim().toLowerCase();

  if (error || !authUser || !googleIdentity || !email || !authUser.email_confirmed_at) {
    throw new AppError('GOOGLE_LOGIN_FAILED');
  }

  const identityData = googleIdentity.identity_data ?? {};
  const name = identityString(identityData.name) ?? identityString(identityData.full_name);
  const avatarUrl = identityString(identityData.avatar_url) ?? identityString(identityData.picture);
  const profile = { supabaseAuthId: authUser.id, email, name, avatarUrl };

  let user = await findUserBySupabaseAuthId(authUser.id);
  if (user) {
    user = await linkGoogleProfile(user, profile);
  } else {
    const existingByEmail = await findUserByEmail(email);
    if (existingByEmail?.supabase_auth_id && existingByEmail.supabase_auth_id !== authUser.id) {
      throw new AppError('GOOGLE_ACCOUNT_CONFLICT');
    }
    user = existingByEmail ? await linkGoogleProfile(existingByEmail, profile) : await insertGoogleUser(profile);
  }

  return { token: signAuthToken({ sub: user.id }), user: toPublicUser(user) };
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
  const email = profile.email?.trim().toLowerCase() ?? null;
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
    const existingByEmail = email ? await findUserByEmail(email) : null;
    user = existingByEmail
      ? await linkNaverProfile(existingByEmail.id, {
          naverId: profile.id,
          name: existingByEmail.name_customized ? undefined : name ?? existingByEmail.name,
          avatarUrl: existingByEmail.avatar_customized ? undefined : avatarUrl ?? existingByEmail.avatar_url,
        })
      : await insertNaverUser({ naverId: profile.id, email, name, avatarUrl });
  }

  return { token: signAuthToken({ sub: user.id }), user: toPublicUser(user) };
}
