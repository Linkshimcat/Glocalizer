import { beforeEach, describe, expect, it, vi } from 'vitest';

const { query, createSignedUrl } = vi.hoisted(() => ({
  query: {
    select: vi.fn(), eq: vi.fn(), not: vi.fn(), in: vi.fn(), order: vi.fn(), limit: vi.fn(),
  },
  createSignedUrl: vi.fn(),
}));

vi.mock('../../src/config/supabase.js', () => ({ supabase: { from: vi.fn(() => query) } }));
vi.mock('../../src/repositories/storage.repository.js', () => ({ createSignedUrl }));

const { listLandingShowcases, resetShowcaseCache } = await import('../../src/services/showcase.service.js');

const rows = [
  { id: 'case-1', source_kind: 'localization', language_code: 'en', original_path: 'landing-showcase/a.png', result_path: 'landing-showcase/b.png', sort_order: 0 },
  { id: 'case-2', source_kind: 'generation', language_code: null, original_path: 'projects/private.png', result_path: 'landing-showcase/c.png', sort_order: 1 },
];

describe('listLandingShowcases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    resetShowcaseCache();
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.not.mockReturnValue(query);
    query.in.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockResolvedValue({ data: rows, error: null });
    createSignedUrl.mockImplementation(async (path: string) => `https://storage.test/${path}`);
  });

  it('권리 확인 및 팀 승인 후 게시된 사례만 조회하고 복사된 자산의 서명 URL만 반환한다', async () => {
    const cases = await listLandingShowcases();

    expect(query.eq).toHaveBeenCalledWith('published', true);
    expect(query.not).toHaveBeenCalledWith('rights_confirmed_at', 'is', null);
    expect(query.in).toHaveBeenCalledWith('rights_basis', ['team_owned', 'licensed']);
    expect(query.not).toHaveBeenCalledWith('approved_at', 'is', null);
    expect(createSignedUrl).toHaveBeenCalledTimes(2);
    expect(cases).toEqual([{
      id: 'case-1', kind: 'localization', languageCode: 'en',
      originalUrl: 'https://storage.test/landing-showcase/a.png',
      resultUrl: 'https://storage.test/landing-showcase/b.png', sortOrder: 0,
    }]);
  });

  it('사례 이미지의 서명 URL을 만들 수 없으면 해당 사례를 숨긴다', async () => {
    createSignedUrl.mockResolvedValueOnce(null).mockResolvedValueOnce('https://storage.test/result.png');
    await expect(listLandingShowcases()).resolves.toEqual([]);
  });

  describe('캐시', () => {
    const queryCount = () => query.limit.mock.calls.length;

    it('5분 안에는 DB와 Storage를 다시 부르지 않고 같은 결과를 돌려준다', async () => {
      const first = await listLandingShowcases();
      const signed = createSignedUrl.mock.calls.length;
      const second = await listLandingShowcases();

      expect(second).toEqual(first);
      expect(queryCount()).toBe(1);
      expect(createSignedUrl).toHaveBeenCalledTimes(signed);
    });

    it('5분이 지나면 새로 조회해서 서명 URL을 다시 받는다 (URL 유효 1시간보다 훨씬 짧다)', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-02T00:00:00Z'));
      await listLandingShowcases();
      vi.setSystemTime(new Date('2026-11-02T00:04:59Z'));
      await listLandingShowcases();
      expect(queryCount()).toBe(1);
      vi.setSystemTime(new Date('2026-11-02T00:05:01Z'));
      await listLandingShowcases();
      expect(queryCount()).toBe(2);
    });

    it('캐시가 비어 있을 때 동시에 들어온 요청은 한 번만 조회한다', async () => {
      const results = await Promise.all([listLandingShowcases(), listLandingShowcases(), listLandingShowcases()]);

      expect(queryCount()).toBe(1);
      expect(results[1]).toEqual(results[0]);
      expect(results[2]).toEqual(results[0]);
    });

    it('조회에 실패하면 캐시하지 않고, 다음 요청이 다시 시도한다', async () => {
      query.limit.mockResolvedValueOnce({ data: null, error: { message: 'db down' } });
      await expect(listLandingShowcases()).rejects.toThrow();

      await expect(listLandingShowcases()).resolves.toHaveLength(1);
      expect(queryCount()).toBe(2);
    });

    it('서명 실패로 사례가 빠졌으면 캐시하지 않아서, 일시 오류가 5분간 갤러리를 비우지 않는다', async () => {
      createSignedUrl.mockResolvedValueOnce(null).mockResolvedValueOnce('https://storage.test/result.png');
      await expect(listLandingShowcases()).resolves.toEqual([]);

      await expect(listLandingShowcases()).resolves.toHaveLength(1);
      expect(queryCount()).toBe(2);
    });

    it('경로 규칙에 맞지 않아 빠진 사례는 고정된 결과라 정상적으로 캐시한다', async () => {
      await listLandingShowcases(); // rows[1]은 landing-showcase/ 밖의 경로라 항상 제외된다
      await listLandingShowcases();
      expect(queryCount()).toBe(1);
    });

    it('캐시한 뒤에 사례를 바꿔도 만료 전에는 이전 결과를 준다 (게시 취소가 최대 5분 늦는 것을 확인하는 테스트)', async () => {
      const first = await listLandingShowcases();
      query.limit.mockResolvedValue({ data: [], error: null });
      expect(await listLandingShowcases()).toEqual(first);
    });
  });
});
