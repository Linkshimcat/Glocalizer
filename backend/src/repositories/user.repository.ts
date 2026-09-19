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

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  const result = await supabase
    .from('users')
    .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
    .eq('id', userId);
  unwrapVoid(result, '비밀번호 변경에 실패했습니다.');
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
