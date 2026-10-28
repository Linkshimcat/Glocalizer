import { AppError } from '../errors/app-error.js';
import { supabase } from '../config/supabase.js';
import { unwrapNullableRow, unwrapRow, unwrapVoid } from '../utils/db-result.js';
import type { UserRow } from '../types/user.js';

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const result = await supabase.from('users').select().eq('email', email).maybeSingle();
  return unwrapNullableRow<UserRow>(result, '사용자 조회에 실패했습니다.');
}

export async function findUserByNaverId(naverId: string): Promise<UserRow | null> {
  const result = await supabase.from('users').select().eq('naver_id', naverId).maybeSingle();
  return unwrapNullableRow<UserRow>(result, '사용자 조회에 실패했습니다.');
}

export async function findUserByKakaoId(kakaoId: string): Promise<UserRow | null> {
  const result = await supabase.from('users').select().eq('kakao_id', kakaoId).maybeSingle();
  return unwrapNullableRow<UserRow>(result, '사용자 조회에 실패했습니다.');
}

export async function findUserBySupabaseAuthId(supabaseAuthId: string): Promise<UserRow | null> {
  const result = await supabase.from('users').select().eq('supabase_auth_id', supabaseAuthId).maybeSingle();
  return unwrapNullableRow<UserRow>(result, '사용자 조회에 실패했습니다.');
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const result = await supabase.from('users').select().eq('id', id).maybeSingle();
  return unwrapNullableRow<UserRow>(result, '사용자 조회에 실패했습니다.');
}

/** projects/generation_projects는 owner_id가 ON DELETE CASCADE라 이 행을 지우면 함께
 *  정리되지만, Storage 파일은 별도 정리가 끝난 뒤에 호출해야 한다 (deleteAccount 참고). */
export async function deleteUserRow(id: string): Promise<void> {
  const result = await supabase.from('users').delete().eq('id', id);
  unwrapVoid(result, '계정 삭제에 실패했습니다.');
}

export async function updateUserPassword(userId: string, passwordHash: string, version: number): Promise<void> {
  const result = await supabase
    .from('users')
    .update({ password_hash: passwordHash, session_version: version + 1, updated_at: new Date().toISOString() })
    .eq('id', userId).eq('session_version', version).select('id').maybeSingle();
  const user = unwrapNullableRow(result, '비밀번호 변경에 실패했습니다.');
  if (!user) throw new AppError('UNAUTHORIZED');
}

export interface SecurityEmailPreferencePatch {
  securityEmailNotifications?: boolean;
  newDeviceLogin?: boolean;
  passwordChanged?: boolean;
  otherSessionsSignedOut?: boolean;
}

/** 요청에 들어온 항목만 바꾼다. */
export async function updateSecurityEmailPreferences(userId: string, patch: SecurityEmailPreferencePatch): Promise<UserRow> {
  const columns: Record<string, boolean> = {};
  if (patch.securityEmailNotifications !== undefined) columns.security_email_notifications = patch.securityEmailNotifications;
  if (patch.newDeviceLogin !== undefined) columns.security_email_new_device = patch.newDeviceLogin;
  if (patch.passwordChanged !== undefined) columns.security_email_password_changed = patch.passwordChanged;
  if (patch.otherSessionsSignedOut !== undefined) columns.security_email_sessions_revoked = patch.otherSessionsSignedOut;
  const result = await supabase
    .from('users')
    .update({ ...columns, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  return unwrapRow<UserRow>(result, '보안 이메일 설정을 저장하지 못했습니다.');
}

/** 모든 기기의 토큰을 무효화한다(session_version +1). 동시에 바뀌었으면 UNAUTHORIZED. */
export async function bumpSessionVersion(userId: string, version: number): Promise<number> {
  const result = await supabase
    .from('users')
    .update({ session_version: version + 1, updated_at: new Date().toISOString() })
    .eq('id', userId).eq('session_version', version).select('id').maybeSingle();
  const user = unwrapNullableRow(result, '로그아웃에 실패했습니다.');
  if (!user) throw new AppError('UNAUTHORIZED');
  return version + 1;
}

interface InsertEmailUserInput {
  email: string;
  passwordHash: string;
  name?: string;
}

export async function insertEmailUser(input: InsertEmailUserInput): Promise<UserRow> {
  const result = await supabase
    .from('users')
    .insert({ email: input.email, password_hash: input.passwordHash, name: input.name ?? null, signup_method: 'email' })
    .select()
    .single();

  return unwrapRow<UserRow>(result, '회원가입에 실패했습니다.');
}

interface InsertNaverUserInput {
  naverId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export async function insertNaverUser(input: InsertNaverUserInput): Promise<UserRow> {
  const result = await supabase
    .from('users')
    .insert({ naver_id: input.naverId, email: input.email, name: input.name, avatar_url: input.avatarUrl, signup_method: 'naver' })
    .select()
    .single();

  return unwrapRow<UserRow>(result, '네이버 로그인 처리에 실패했습니다.');
}

interface LinkNaverProfileInput {
  naverId: string;
  /** undefined면 기존 값을 유지한다(사용자가 직접 바꾼 프로필 보호). */
  name?: string | null;
  avatarUrl?: string | null;
}

/** naver_id로 기존 행을 찾았을 때의 재로그인(프로필 갱신)과, 이메일로 가입했던 계정에
 *  네이버 계정을 처음 연결하는 경우 둘 다 같은 update라 하나로 합쳤다. */
export async function linkNaverProfile(userId: string, input: LinkNaverProfileInput): Promise<UserRow> {
  const patch: Record<string, unknown> = { naver_id: input.naverId, updated_at: new Date().toISOString() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.avatarUrl !== undefined) patch.avatar_url = input.avatarUrl;
  const result = await supabase
    .from('users')
    .update(patch)
    .eq('id', userId)
    .select()
    .single();

  return unwrapRow<UserRow>(result, '네이버 로그인 처리에 실패했습니다.');
}

interface InsertKakaoUserInput {
  kakaoId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export async function insertKakaoUser(input: InsertKakaoUserInput): Promise<UserRow> {
  const result = await supabase
    .from('users')
    .insert({ kakao_id: input.kakaoId, email: input.email, name: input.name, avatar_url: input.avatarUrl, signup_method: 'kakao' })
    .select()
    .single();

  return unwrapRow<UserRow>(result, '카카오 로그인 처리에 실패했습니다.');
}

interface LinkKakaoProfileInput {
  kakaoId: string;
  /** undefined면 기존 값을 유지한다(사용자가 직접 바꾼 프로필 보호). */
  name?: string | null;
  avatarUrl?: string | null;
}

/** kakao_id로 기존 행을 찾았을 때의 재로그인(프로필 갱신)과, 이메일로 가입했던 계정에
 *  카카오 계정을 처음 연결하는 경우 둘 다 같은 update라 하나로 합쳤다(linkNaverProfile과 동일 패턴). */
export async function linkKakaoProfile(userId: string, input: LinkKakaoProfileInput): Promise<UserRow> {
  const patch: Record<string, unknown> = { kakao_id: input.kakaoId, updated_at: new Date().toISOString() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.avatarUrl !== undefined) patch.avatar_url = input.avatarUrl;
  const result = await supabase
    .from('users')
    .update(patch)
    .eq('id', userId)
    .select()
    .single();

  return unwrapRow<UserRow>(result, '카카오 로그인 처리에 실패했습니다.');
}

interface GoogleProfileInput {
  supabaseAuthId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export async function insertGoogleUser(input: GoogleProfileInput): Promise<UserRow> {
  const result = await supabase
    .from('users')
    .insert({
      supabase_auth_id: input.supabaseAuthId,
      email: input.email,
      name: input.name,
      avatar_url: input.avatarUrl,
      signup_method: 'google',
    })
    .select()
    .single();

  return unwrapRow<UserRow>(result, 'Google 로그인 처리에 실패했습니다.');
}

export async function linkGoogleProfile(user: UserRow, input: GoogleProfileInput): Promise<UserRow> {
  const patch: Record<string, unknown> = {
    supabase_auth_id: input.supabaseAuthId,
    updated_at: new Date().toISOString(),
  };
  if (!user.name_customized) patch.name = input.name;
  if (!user.avatar_customized) patch.avatar_url = input.avatarUrl;
  const result = await supabase.from('users').update(patch).eq('id', user.id).select().single();
  return unwrapRow<UserRow>(result, 'Google 로그인 처리에 실패했습니다.');
}

interface UpdateUserProfileInput {
  name?: string;
  avatarUrl?: string | null;
}

export async function updateUserProfile(userId: string, input: UpdateUserProfileInput): Promise<UserRow> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) {
    patch.name = input.name;
    patch.name_customized = true;
  }
  if (input.avatarUrl !== undefined) {
    patch.avatar_url = input.avatarUrl;
    patch.avatar_customized = true;
  }
  const result = await supabase.from('users').update(patch).eq('id', userId).select().single();
  return unwrapRow<UserRow>(result, '프로필 저장에 실패했습니다.');
}

export async function activateMembership(userId: string, planId: string, expiresAt: Date): Promise<void> {
  const result = await supabase
    .from('users')
    .update({ membership_plan: planId, membership_expires_at: expiresAt.toISOString(), updated_at: new Date().toISOString() })
    .eq('id', userId);
  unwrapVoid(result, '멤버십 활성화에 실패했습니다.');
}
