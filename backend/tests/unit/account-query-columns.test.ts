import { beforeEach, describe, expect, it, vi } from 'vitest';

// 쿼리 빌더 체인을 흉내 내고 select에 넘긴 컬럼만 기록한다.
const calls = vi.hoisted(() => ({ select: [] as Array<string | undefined>, result: { data: null as unknown, error: null } }));
const builder = vi.hoisted(() => {
  const chain: Record<string, unknown> = {};
  for (const method of ['eq', 'is', 'order']) chain[method] = () => chain;
  chain.maybeSingle = async () => calls.result;
  chain.then = (resolve: (value: unknown) => void) => resolve(calls.result);
  return chain;
});
vi.mock('../../src/config/supabase.js', () => ({
  supabase: { from: () => ({ select: (columns?: string) => { calls.select.push(columns); return builder; } }) },
}));

const { findUserById } = await import('../../src/repositories/user.repository.js');
const { findProjectActivityByOwner } = await import('../../src/repositories/project.repository.js');

beforeEach(() => {
  calls.select = [];
  calls.result = { data: null, error: null };
});

describe('가벼운 조회', () => {
  it('인증용 사용자 조회는 프로필 사진(avatar_url) 없이 인증에 필요한 컬럼만 읽는다', async () => {
    await findUserById('u1', 'auth');
    const columns = calls.select[0]!.split(',').map((c) => c.trim());
    expect(columns).not.toContain('avatar_url');
    expect(columns).toEqual(expect.arrayContaining(['id', 'email', 'session_version', 'deleting_at']));
  });

  it('보통 조회는 지금처럼 전체 컬럼을 읽는다 (/auth/me는 사진이 필요하다)', async () => {
    await findUserById('u1');
    expect(calls.select[0]).toBeUndefined();
  });

  it('작업 요약용 프로젝트 조회는 완료 여부와 갱신 시각만 읽는다', async () => {
    calls.result = { data: [], error: null };
    await findProjectActivityByOwner('u1');
    expect(calls.select[0]!.split(',').map((c) => c.trim()).sort()).toEqual(['result_ready', 'updated_at']);
  });
});
