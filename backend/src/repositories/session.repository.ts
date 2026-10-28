import { supabase } from '../config/supabase.js';
import { unwrapList, unwrapNullableRow, unwrapRow, unwrapVoid } from '../utils/db-result.js';
import type { LoginMethod, SessionRow } from '../types/session.js';

/** last_seen_at은 요청마다 쓰지 않고 이 간격이 지났을 때만 갱신한다. */
const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;

interface InsertSessionInput {
  userId: string;
  loginMethod: LoginMethod;
  userAgent: string | null;
  deviceLabel: string | null;
  ipMasked: string | null;
  expiresAt: Date;
}

export async function insertSession(input: InsertSessionInput): Promise<SessionRow> {
  const result = await supabase
    .from('user_sessions')
    .insert({
      user_id: input.userId,
      login_method: input.loginMethod,
      user_agent: input.userAgent,
      device_label: input.deviceLabel,
      ip_masked: input.ipMasked,
      expires_at: input.expiresAt.toISOString(),
    })
    .select()
    .single();
  return unwrapRow<SessionRow>(result, '로그인 세션 생성에 실패했습니다.');
}

export async function findSessionById(id: string): Promise<SessionRow | null> {
  const result = await supabase.from('user_sessions').select().eq('id', id).maybeSingle();
  return unwrapNullableRow<SessionRow>(result, '로그인 세션 조회에 실패했습니다.');
}

/** 마지막 갱신이 오래됐을 때만 last_seen_at을 올린다. 실패해도 요청 자체는 막지 않는다. */
export async function touchSessionIfStale(session: SessionRow): Promise<void> {
  if (Date.now() - new Date(session.last_seen_at).getTime() < LAST_SEEN_THROTTLE_MS) return;
  await supabase.from('user_sessions').update({ last_seen_at: new Date().toISOString() }).eq('id', session.id);
}

export async function listActiveSessions(userId: string): Promise<SessionRow[]> {
  const result = await supabase
    .from('user_sessions')
    .select()
    .eq('user_id', userId)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('last_seen_at', { ascending: false })
    .limit(50);
  return unwrapList<SessionRow>(result, '로그인 세션 조회에 실패했습니다.');
}

/** 폐기·만료된 세션까지 포함한 최근 로그인 기록. 세션 행은 삭제하지 않으므로 그대로 이력이 된다. */
export async function listLoginHistory(userId: string, limit: number): Promise<SessionRow[]> {
  const result = await supabase
    .from('user_sessions')
    .select()
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return unwrapList<SessionRow>(result, '로그인 기록 조회에 실패했습니다.');
}

/** 본인 소유의 활성 세션만 폐기한다. 폐기한 행이 없으면 false. */
export async function revokeSession(userId: string, sessionId: string): Promise<boolean> {
  const result = await supabase
    .from('user_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle();
  return unwrapNullableRow(result, '로그아웃에 실패했습니다.') !== null;
}

/** exceptSessionId를 뺀 활성 세션을 모두 폐기한다. */
export async function revokeOtherSessions(userId: string, exceptSessionId: string | null): Promise<void> {
  let query = supabase
    .from('user_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null);
  if (exceptSessionId) query = query.neq('id', exceptSessionId);
  unwrapVoid(await query, '로그아웃에 실패했습니다.');
}

/** 폐기되지 않은 세션의 만료 시각을 늘린다(토큰을 재발급할 때). */
export async function extendSession(sessionId: string, expiresAt: Date): Promise<void> {
  const result = await supabase
    .from('user_sessions')
    .update({ expires_at: expiresAt.toISOString(), last_seen_at: new Date().toISOString() })
    .eq('id', sessionId)
    .is('revoked_at', null);
  unwrapVoid(result, '로그인 세션 갱신에 실패했습니다.');
}
