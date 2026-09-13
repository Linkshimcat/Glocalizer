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

interface UpsertNaverUserInput {
  naverId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

/** 네이버로 재로그인할 때 프로필(이름/사진)이 바뀌었을 수 있어 매번 upsert로 최신화한다. */
export async function upsertNaverUser(input: UpsertNaverUserInput): Promise<UserRow> {
  const result = await supabase
    .from('users')
    .upsert(
      {
        naver_id: input.naverId,
        email: input.email,
        name: input.name,
        avatar_url: input.avatarUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'naver_id' },
    )
    .select()
    .single();

  return unwrapRow<UserRow>(result, '네이버 로그인 처리에 실패했습니다.');
}
