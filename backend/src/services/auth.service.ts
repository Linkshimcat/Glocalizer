import { deleteDurably } from './deletion.service.js';
import { taskFetch } from '../utils/task-context.js';
import sharp from 'sharp';
import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { AppError } from '../errors/app-error.js';
import {
  bumpSessionVersion,
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
import { extendSession, insertSession, listActiveSessions, revokeOtherSessions, revokeSession } from '../repositories/session.repository.js';
import type { LoginMethod, PublicSession, SessionContext } from '../types/session.js';
import type { PublicUser, UserRow } from '../types/user.js';
import { parseDeviceLabel, maskIp } from '../utils/device-info.js';
import { AUTH_TOKEN_TTL_SECONDS, signAuthToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { sendWelcomeEmail } from './email.service.js';

async function fetchAuthProvider(url: string, init: RequestInit): Promise<Response> {
  try { return await taskFetch(url, init); }
  catch { throw new AppError('NAVER_LOGIN_FAILED', undefined, '인증 서버 연결이 실패하거나 시간이 초과됐습니다.'); }
}

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
    membershipPlan: user.membership_plan,
    membershipExpiresAt: user.membership_expires_at,
  };
}

function sessionExpiry(): Date {
  return new Date(Date.now() + AUTH_TOKEN_TTL_SECONDS * 1000);
}

/** 기기 정보는 라벨(브라우저 · OS)과 마스킹한 IP만 저장한다. User-Agent 원문은 길이를 자른다. */
function sessionDevice(context: SessionContext) {
  return {
    userAgent: context.userAgent ? context.userAgent.slice(0, 255) : null,
    deviceLabel: parseDeviceLabel(context.userAgent),
    ipMasked: maskIp(context.ip),
  };
}

async function issueSession(user: UserRow, loginMethod: LoginMethod, context: SessionContext): Promise<AuthResult> {
  if (user.deleting_at) throw new AppError('UNAUTHORIZED');
  const session = await insertSession({ userId: user.id, loginMethod, expiresAt: sessionExpiry(), ...sessionDevice(context) });
  return { token: signAuthToken({ sub: user.id, ver: user.session_version ?? 0, sid: session.id }), user: toPublicUser(user) };
}

export async function signup(input: SignupInput, context: SessionContext = {}): Promise<AuthResult> {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new AppError('EMAIL_ALREADY_REGISTERED', { email: input.email });
  }

  const user = await insertEmailUser({
    email: input.email,
    passwordHash: await hashPassword(input.password),
    name: input.name,
  });
  // 메일은 기다리지 않는다: 발송이 느리거나 실패해도 가입 응답에 영향을 주지 않는다.
  void sendWelcomeEmail(user);

  return issueSession(user, 'email', context);
}

export async function login(input: LoginInput, context: SessionContext = {}): Promise<AuthResult> {
  const user = await findUserByEmail(input.email);
  if (!user || !user.password_hash || !await verifyPassword(input.password, user.password_hash)) {
    throw new AppError('INVALID_CREDENTIALS');
  }

  return issueSession(user, 'email', context);
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
  if (!await verifyPassword(input.currentPassword, user.password_hash)) {
    throw new AppError('CURRENT_PASSWORD_INCORRECT');
  }

  await updateUserPassword(userId, await hashPassword(input.newPassword), user.session_version ?? 0);
  await revokeOtherSessions(userId, null);
}

/** 로그인 중인 기기 목록. sid가 없는 현재 토큰(이전 방식)은 "이전 세션" 한 줄로 맨 앞에 보여준다. */
export async function getSessions(userId: string, currentSid: string | undefined): Promise<PublicSession[]> {
  const rows = await listActiveSessions(userId);
  const sessions: PublicSession[] = rows.map((row) => ({
    id: row.id,
    deviceLabel: row.device_label,
    ipMasked: row.ip_masked,
    loginMethod: row.login_method,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    current: row.id === currentSid,
  }));
  if (!currentSid) {
    const now = new Date().toISOString();
    sessions.unshift({ id: 'legacy', deviceLabel: null, ipMasked: null, loginMethod: 'email', createdAt: now, lastSeenAt: now, current: true, legacy: true });
  }
  return sessions;
}

export async function logoutSession(userId: string, currentSid: string | undefined): Promise<void> {
  if (currentSid) await revokeSession(userId, currentSid);
}

export async function revokeUserSession(userId: string, sessionId: string): Promise<void> {
  if (!await revokeSession(userId, sessionId)) throw new AppError('NOT_FOUND');
}

/** 현재 기기를 뺀 모든 기기를 로그아웃한다. session_version을 올리면 현재 토큰도 무효가 되므로
 *  같은 세션 행(없으면 새로 만든 행)을 가리키는 새 토큰을 돌려준다. 기기별 세션 도입 이전 토큰도 함께 끊긴다. */
export async function revokeOtherUserSessions(userId: string, currentSid: string | undefined, context: SessionContext): Promise<AuthResult> {
  const user = await findUserById(userId);
  if (!user || user.deleting_at) throw new AppError('UNAUTHORIZED');

  const version = await bumpSessionVersion(userId, user.session_version ?? 0);
  await revokeOtherSessions(userId, currentSid ?? null);

  let sid = currentSid;
  if (sid) await extendSession(sid, sessionExpiry());
  else sid = (await insertSession({ userId, loginMethod: user.signup_method, expiresAt: sessionExpiry(), ...sessionDevice(context) })).id;

  return { token: signAuthToken({ sub: userId, ver: version, sid }), user: toPublicUser({ ...user, session_version: version }) };
}

/** 현지화 프로젝트·생성 결과의 Storage 파일부터 지운 뒤 계정 행을 지운다 — 순서를 바꾸면
 *  users 행 삭제가 먼저 FK cascade로 projects/generation_projects를 지워버려 Storage 파일이
 *  고아로 남는다. Google 연동 계정이면 Supabase Auth 사용자도 함께 정리한다. */
export async function deleteAccount(userId: string): Promise<void> {
  await deleteDurably('account', userId);
}

function identityString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function loginWithGoogle(input: GoogleLoginInput, context: SessionContext = {}): Promise<AuthResult> {
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
    if (existingByEmail) {
      throw new AppError('ACCOUNT_LINK_REQUIRED');
    } else {
      user = await insertGoogleUser(profile);
      void sendWelcomeEmail(user);
    }
  }

  return issueSession(user, 'google', context);
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
export async function loginWithNaver(code: string, state: string, context: SessionContext = {}): Promise<AuthResult> {
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

  const tokenResponse = await fetchAuthProvider(`${NAVER_TOKEN_URL}?${tokenParams.toString()}`, { signal: AbortSignal.timeout(env.AUTH_PROVIDER_TIMEOUT_MS) });
  const tokenJson = (await tokenResponse.json().catch(() => ({}))) as NaverTokenResponse;
  if (!tokenResponse.ok || !tokenJson.access_token) {
    throw new AppError('NAVER_LOGIN_FAILED', { cause: tokenJson.error_description ?? tokenJson.error });
  }

  const profileResponse = await fetchAuthProvider(NAVER_PROFILE_URL, {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    signal: AbortSignal.timeout(env.AUTH_PROVIDER_TIMEOUT_MS),
  });
  const profileJson = (await profileResponse.json().catch(() => ({}))) as NaverProfileResponse;
  if (!profileResponse.ok || profileJson.resultcode !== '00' || !profileJson.response) {
    throw new AppError('NAVER_LOGIN_FAILED', { cause: profileJson.message });
  }

  const profile = profileJson.response;
  const email = profile.email?.trim().toLowerCase() ?? null;
  const name = profile.name ?? null;
  const avatarUrl = profile.profile_image ?? null;

  // A matching email alone is not proof of ownership of an existing local account.
  // Only the already linked provider identity may authenticate that account.
  let user = await findUserByNaverId(profile.id);
  if (user) {
    user = await linkNaverProfile(user.id, {
      naverId: profile.id,
      name: user.name_customized ? undefined : name,
      avatarUrl: user.avatar_customized ? undefined : avatarUrl,
    });
  } else {
    const existingByEmail = email ? await findUserByEmail(email) : null;
    if (existingByEmail) {
      throw new AppError('ACCOUNT_LINK_REQUIRED');
    } else {
      user = await insertNaverUser({ naverId: profile.id, email, name, avatarUrl });
      void sendWelcomeEmail(user);
    }
  }

  return issueSession(user, 'naver', context);
}
