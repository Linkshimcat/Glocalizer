import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const testEnv = vi.hoisted(() => ({
  OGQ_API_KEY: 'test-ogq-key',
  OGQ_API_BASE_URL: 'https://ogq.example.test',
}));

vi.mock('../../src/config/env.js', () => ({ env: testEnv }));

const { fetchOgqStickers } = await import('../../src/services/ogq.service.js');

function mockAssetsResponse(elements: unknown[]) {
  return new Response(JSON.stringify({ page: 0, pageSize: elements.length, total: elements.length, hasNext: false, elements }), { status: 200 });
}

afterEach(() => vi.unstubAllGlobals());

describe('fetchOgqStickers', () => {
  beforeEach(() => {
    testEnv.OGQ_API_KEY = 'test-ogq-key';
  });

  it('OGQ_API_KEY가 없으면 즉시 OGQ_NOT_CONFIGURED를 던진다', async () => {
    testEnv.OGQ_API_KEY = '';
    await expect(fetchOgqStickers(12)).rejects.toMatchObject({ code: 'OGQ_NOT_CONFIGURED' });
  });

  it('X-OGQ-API-KEY 헤더로 인기 스티커를 조회하고 필요한 필드만 내려준다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockAssetsResponse([
        {
          assetId: 'a1',
          title: '웃는 얼굴',
          thumbnailUrl: 'https://cdn.test/a1-thumb.png',
          animated: false,
          type: 'STICKER',
          categories: [{ categoryId: 'c1', krName: '감정', enName: 'Emotion' }],
        },
      ]),
    );
    vi.stubGlobal('fetch', fetchMock);

    const stickers = await fetchOgqStickers(12);

    expect(stickers).toEqual([{
      assetId: 'a1',
      title: '웃는 얼굴',
      thumbnailUrl: 'https://cdn.test/a1-thumb.png',
      animated: false,
      categories: [{ krName: '감정', enName: 'Emotion' }],
    }]);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('https://ogq.example.test/v1/assets?');
    expect(url).toContain('type=STICKER');
    expect(url).toContain('ordering=POPULAR');
    expect((init.headers as Record<string, string>)['X-OGQ-API-KEY']).toBe('test-ogq-key');
  });

  it('두 번째 호출은 캐시를 써서 fetch를 다시 부르지 않는다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockAssetsResponse([{ assetId: 'a1', title: null, thumbnailUrl: 'x', animated: false, type: 'STICKER' }]));
    vi.stubGlobal('fetch', fetchMock);

    await fetchOgqStickers(7);
    await fetchOgqStickers(7);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('OGQ API가 실패 응답을 주면 OGQ_REQUEST_FAILED를 던진다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('error', { status: 500 })));
    await expect(fetchOgqStickers(9)).rejects.toMatchObject({ code: 'OGQ_REQUEST_FAILED' });
  });

  it('query가 있으면 검색어를 쿼리스트링에 실어 보내고, query별로 캐시를 분리한다', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(mockAssetsResponse([])));
    vi.stubGlobal('fetch', fetchMock);

    await fetchOgqStickers(6, '고마워');
    await fetchOgqStickers(6, '고마워');
    await fetchOgqStickers(6, '안녕');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [firstUrl] = fetchMock.mock.calls[0] as [string];
    expect(firstUrl).toContain(`query=${encodeURIComponent('고마워')}`);
  });
});
