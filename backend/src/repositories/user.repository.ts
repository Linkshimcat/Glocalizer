import { supabase } from '../config/supabase.js';
import { unwrapNullableRow, unwrapRow } from '../utils/db-result.js';
import type { UserRow } from '../types/user.js';

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const result = await supabase.from('users').select().eq('email', email).maybeSingle();
  return unwrapNullableRow<UserRow>(result, '사용자 조회에 실패했습니다.');
}

export async function findUserByNaverId(naverId: string): Promise<UserRow | null> {
  const result = await supabase.from('users').select().eq('naver_id', naverId).maybeSingle();
  return unwrapNullableRow<UserRow>(result, '사용자 조회에 실패했습니다.');
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const result = await supabase.from('users').select().eq('id', id).maybeSingle();
  return unwrapNullableRow<UserRow>(result, '사용자 조회에 실패했습니다.');
}

interface InsertEmailUserInput {
  email: string;
  passwordHash: string;
  name?: string;
}

export async function insertEmailUser(input: InsertEmailUserInput): Promise<UserRow> {
  const result = await supabase
    .from('users')
    .insert({ email: input.email, password_hash: input.passwordHash, name: input.name ?? null })
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
    .insert({ naver_id: input.naverId, email: input.email, name: input.name, avatar_url: input.avatarUrl })
    .select()
    .single();

  return unwrapRow<UserRow>(result, '네이버 로그인 처리에 실패했습니다.');
}

interface LinkNaverProfileInput {
  naverId: string;
  name: string | null;
  avatarUrl: string | null;
}

/** naver_id로 기존 행을 찾았을 때의 재로그인(프로필 갱신)과, 이메일로 가입했던 계정에
 *  네이버 계정을 처음 연결하는 경우 둘 다 같은 update라 하나로 합쳤다. */
export async function linkNaverProfile(userId: string, input: LinkNaverProfileInput): Promise<UserRow> {
  const result = await supabase
    .from('users')
    .update({ naver_id: input.naverId, name: input.name, avatar_url: input.avatarUrl, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  return unwrapRow<UserRow>(result, '네이버 로그인 처리에 실패했습니다.');
}
