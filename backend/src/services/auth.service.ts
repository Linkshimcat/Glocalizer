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
  findUserByKakaoId,
  findUserByNaverId,
  findUserBySupabaseAuthId,
  insertEmailUser,
  insertGoogleUser,
  insertKakaoUser,
  insertNaverUser,
  linkGoogleProfile,
  linkKakaoProfile,
  linkNaverProfile,
  updateUserPassword,
  updateUserProfile,
  updateSecurityEmailPreferences,
} from '../repositories/user.repository.js';
import type { ChangePasswordInput, DeleteAccountInput, EmailPreferencesInput, GoogleLoginInput, LoginInput, SignupInput, UpdateProfileInput } from '../schemas/auth.schema.js';
import { extendSession, insertSession, listActiveSessions, revokeOtherSessions, revokeSession } from '../repositories/session.repository.js';
import { rememberDevice } from '../repositories/known-device.repository.js';
import type { LoginMethod, PublicSession, SessionContext } from '../types/session.js';
import type { PublicUser, UserRow } from '../types/user.js';
import { parseDeviceLabel, maskIp } from '../utils/device-info.js';
import { AUTH_TOKEN_TTL_SECONDS, signAuthToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { sendEmail, sendNewDeviceLoginEmail, sendOtherSessionsSignedOutEmail, sendPasswordChangedEmail, sendWelcomeEmail } from './email.service.js';
import { renderVerificationCodeEmail } from '../emails/verification-code-email.js';
import { maskEmail } from '../utils/mask-email.js';
import { createVerificationChallenge, verifyVerificationCode, VERIFICATION_CODE_TTL_SECONDS, type VerificationPurpose } from '../utils/verification-code.js';

async function fetchAuthProvider(url: string, init: RequestInit, failureCode: 'NAVER_LOGIN_FAILED' | 'KAKAO_LOGIN_FAILED' = 'NAVER_LOGIN_FAILED'): Promise<Response> {
  try { return await taskFetch(url, init); }
  catch { throw new AppError(failureCode, undefined, '인증 서버 연결이 실패하거나 시간이 초과됐습니다.'); }
}

const NAVER_TOKEN_URL = 'https://nid.naver.com/oauth2.0/token';
const NAVER_PROFILE_URL = 'https://openapi.naver.com/v1/nid/me';
const KAKAO_TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
const KAKAO_PROFILE_URL = 'https://kapi.kakao.com/v2/user/me';

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
    hasKakao: user.kakao_id !== null,
    membershipPlan: user.membership_plan,
    membershipExpiresAt: user.membership_expires_at,
    securityEmailNotifications: user.security_email_notifications ?? true,
    securityEmailTypes: {
      newDeviceLogin: user.security_email_new_device ?? true,
      passwordChanged: user.security_email_password_changed ?? true,
      otherSessionsSignedOut: user.security_email_sessions_revoked ?? true,
    },
    createdAt: user.created_at,
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

async function issueSession(user: UserRow, loginMethod: LoginMethod, context: SessionContext, notifyNewDevice: boolean): Promise<AuthResult> {
  if (user.deleting_at) throw new AppError('UNAUTHORIZED');
  const isNewDevice = context.deviceId ? await rememberDevice(user.id, context.deviceId) : false;
  const session = await insertSession({ userId: user.id, loginMethod, expiresAt: sessionExpiry(), ...sessionDevice(context) });
  if (notifyNewDevice && isNewDevice) {
    const device = sessionDevice(context);
    void sendNewDeviceLoginEmail(user, device.deviceLabel, device.ipMasked);
  }
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

  return issueSession(user, 'email', context, false);
}

export async function login(input: LoginInput, context: SessionContext = {}): Promise<AuthResult> {
  const user = await findUserByEmail(input.email);
  if (!user || !user.password_hash || !await verifyPassword(input.password, user.password_hash)) {
    throw new AppError('INVALID_CREDENTIALS');
  }

  return issueSession(user, 'email', context, true);
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await findUserById(userId);
  if (!user) throw new AppError('UNAUTHORIZED');
  return toPublicUser(user);
}

// 화면에서 가장 크게 보이는 곳이 80px(설정 페이지)이라 레티나 2배인 160px이면 충분하다. 사진은 data URL로 users 행에 들어가므로 작을수록 좋다.
const AVATAR_SIZE = 160;

/** 업로드된 이미지를 160px 정사각형 WebP로 다시 인코딩해 data URL로 저장한다.
 *  재인코딩으로 메타데이터/비정상 페이로드를 제거하고, DB에 들어가는 크기를 수 KB로 묶는다. */
async function normalizeAvatar(dataUrl: string): Promise<string> {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  try {
    const webp = await sharp(Buffer.from(base64, 'base64'), { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover' })
      .webp({ quality: 80 })
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

export async function updateEmailPreferences(userId: string, input: EmailPreferencesInput): Promise<PublicUser> {
  return toPublicUser(await updateSecurityEmailPreferences(userId, input));
}

export async function changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
  const user = await findUserById(userId);
  if (!user) throw new AppError('UNAUTHORIZED');
  if (!user.password_hash) throw new AppError('PASSWORD_CHANGE_UNAVAILABLE');
  if (input.currentPassword !== undefined) {
    if (!await verifyPassword(input.currentPassword, user.password_hash)) throw new AppError('CURRENT_PASSWORD_INCORRECT');
  } else {
    assertVerificationCode(input, user, 'change-password');
  }

  await updateUserPassword(userId, await hashPassword(input.newPassword), user.session_version ?? 0);
  await revokeOtherSessions(userId, null);
  void sendPasswordChangedEmail(user);
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

  void sendOtherSessionsSignedOutEmail(user);
  return { token: signAuthToken({ sub: userId, ver: version, sid }), user: toPublicUser({ ...user, session_version: version }) };
}

/** 현지화 프로젝트·생성 결과의 Storage 파일부터 지운 뒤 계정 행을 지운다 — 순서를 바꾸면
 *  users 행 삭제가 먼저 FK cascade로 projects/generation_projects를 지워버려 Storage 파일이
 *  고아로 남는다. Google 연동 계정이면 Supabase Auth 사용자도 함께 정리한다. */
export async function deleteAccount(userId: string, input: DeleteAccountInput = {}): Promise<void> {
  const user = await findUserById(userId);
  if (!user) throw new AppError('UNAUTHORIZED');
  // 로그인 토큰만 탈취당해도 계정이 지워지지 않도록 메일 인증코드를 받는다. 이메일이 없는 계정은 받을 곳이 없어 생략한다.
  if (user.email) assertVerificationCode(input, user, 'delete-account');
  await deleteDurably('account', userId);
}

/** 탈퇴·비밀번호 변경 전에 계정 이메일로 6자리 코드를 보낸다. 코드는 응답에 넣지 않고 서명된 챌린지만 돌려준다. */
export async function sendVerificationCode(userId: string, purpose: VerificationPurpose): Promise<{ challenge: string; sentTo: string; expiresInSeconds: number }> {
  const user = await findUserById(userId);
  if (!user) throw new AppError('UNAUTHORIZED');
  if (!user.email) throw new AppError('EMAIL_REQUIRED');
  if (purpose === 'change-password' && !user.password_hash) throw new AppError('PASSWORD_CHANGE_UNAVAILABLE');

  const { code, challenge } = createVerificationChallenge(user, purpose);
  const sent = await sendEmail({
    to: user.email,
    ...renderVerificationCodeEmail({ code, purpose, siteUrl: env.FRONTEND_ORIGIN, ttlMinutes: VERIFICATION_CODE_TTL_SECONDS / 60 }),
  });
  if (!sent) throw new AppError('EMAIL_NOT_CONFIGURED');
  return { challenge, sentTo: maskEmail(user.email), expiresInSeconds: VERIFICATION_CODE_TTL_SECONDS };
}

function assertVerificationCode(input: { challenge?: string; code?: string }, user: UserRow, purpose: VerificationPurpose): void {
  if (!input.challenge || !input.code) throw new AppError('VERIFICATION_CODE_REQUIRED');
  const result = verifyVerificationCode(input.challenge, input.code, user, purpose);
  if (result === 'expired') throw new AppError('VERIFICATION_CODE_EXPIRED');
  if (result !== 'ok') throw new AppError('VERIFICATION_CODE_INVALID');
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

  let created = false;
  let user = await findUserBySupabaseAuthId(authUser.id);
  if (user) {
    user = await linkGoogleProfile(user, profile);
  } else {
    const existingByEmail = await findUserByEmail(email);
    if (existingByEmail) {
      throw new AppError('ACCOUNT_LINK_REQUIRED');
    } else {
      user = await insertGoogleUser(profile);
      created = true;
      void sendWelcomeEmail(user);
    }
  }

  return issueSession(user, 'google', context, !created);
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
  let created = false;
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
      created = true;
      void sendWelcomeEmail(user);
    }
  }

  return issueSession(user, 'naver', context, !created);
}

interface KakaoTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface KakaoProfileResponse {
  id?: number;
  kakao_account?: { email?: string; profile?: { nickname?: string; profile_image_url?: string } };
}

/** authorization code(프론트에서 카카오 로그인 리다이렉트로 받은 값)를 access token으로 교환하고,
 *  프로필을 조회해 계정을 생성/갱신한다. 네이버와 달리 카카오 토큰 API는 redirect_uri가
 *  인가 요청 때와 정확히 같아야 한다(생략하면 invalid_grant로 거절됨). */
export async function loginWithKakao(code: string, redirectUri: string, context: SessionContext = {}): Promise<AuthResult> {
  if (!env.KAKAO_CLIENT_ID) {
    throw new AppError('KAKAO_NOT_CONFIGURED');
  }

  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.KAKAO_CLIENT_ID,
    redirect_uri: redirectUri,
    code,
    ...(env.KAKAO_CLIENT_SECRET ? { client_secret: env.KAKAO_CLIENT_SECRET } : {}),
  });

  const tokenResponse = await fetchAuthProvider(KAKAO_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: tokenParams.toString(),
    signal: AbortSignal.timeout(env.AUTH_PROVIDER_TIMEOUT_MS),
  }, 'KAKAO_LOGIN_FAILED');
  const tokenJson = (await tokenResponse.json().catch(() => ({}))) as KakaoTokenResponse;
  if (!tokenResponse.ok || !tokenJson.access_token) {
    throw new AppError('KAKAO_LOGIN_FAILED', { cause: tokenJson.error_description ?? tokenJson.error });
  }

  const profileResponse = await fetchAuthProvider(KAKAO_PROFILE_URL, {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    signal: AbortSignal.timeout(env.AUTH_PROVIDER_TIMEOUT_MS),
  }, 'KAKAO_LOGIN_FAILED');
  const profileJson = (await profileResponse.json().catch(() => ({}))) as KakaoProfileResponse;
  if (!profileResponse.ok || profileJson.id === undefined) {
    throw new AppError('KAKAO_LOGIN_FAILED');
  }

  const kakaoId = String(profileJson.id);
  const email = profileJson.kakao_account?.email?.trim().toLowerCase() ?? null;
  const name = profileJson.kakao_account?.profile?.nickname ?? null;
  const avatarUrl = profileJson.kakao_account?.profile?.profile_image_url ?? null;

  // A matching email alone is not proof of ownership of an existing local account.
  // Only the already linked provider identity may authenticate that account.
  let created = false;
  let user = await findUserByKakaoId(kakaoId);
  if (user) {
    user = await linkKakaoProfile(user.id, {
      kakaoId,
      name: user.name_customized ? undefined : name,
      avatarUrl: user.avatar_customized ? undefined : avatarUrl,
    });
  } else {
    const existingByEmail = email ? await findUserByEmail(email) : null;
    if (existingByEmail) {
      throw new AppError('ACCOUNT_LINK_REQUIRED');
    } else {
      user = await insertKakaoUser({ kakaoId, email, name, avatarUrl });
      created = true;
      void sendWelcomeEmail(user);
    }
  }

  return issueSession(user, 'kakao', context, !created);
}
