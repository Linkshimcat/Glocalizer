import { beforeEach, describe, expect, it, vi } from 'vitest';

const { query, createSignedUrl } = vi.hoisted(() => ({
  query: {
    select: vi.fn(), eq: vi.fn(), not: vi.fn(), in: vi.fn(), order: vi.fn(), limit: vi.fn(),
  },
  createSignedUrl: vi.fn(),
}));

vi.mock('../../src/config/supabase.js', () => ({ supabase: { from: vi.fn(() => query) } }));
vi.mock('../../src/repositories/storage.repository.js', () => ({ createSignedUrl }));

const { listLandingShowcases } = await import('../../src/services/showcase.service.js');

const rows = [
  { id: 'case-1', source_kind: 'localization', language_code: 'en', original_path: 'landing-showcase/a.png', result_path: 'landing-showcase/b.png', sort_order: 0 },
  { id: 'case-2', source_kind: 'generation', language_code: null, original_path: 'projects/private.png', result_path: 'landing-showcase/c.png', sort_order: 1 },
];

describe('listLandingShowcases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
