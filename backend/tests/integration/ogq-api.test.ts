import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/services/ogq.service.js', () => ({ fetchOgqStickers: vi.fn() }));

const { createApp } = await import('../../src/app.js');
const service = await import('../../src/services/ogq.service.js');
const app = createApp();

const sticker = { assetId: 'a1', title: '웃는 얼굴', thumbnailUrl: 'https://cdn.test/a1-thumb.png', animated: false };

describe('GET /api/v1/ogq/stickers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('인증 없이 인기 스티커 목록을 반환한다', async () => {
    vi.mocked(service.fetchOgqStickers).mockResolvedValue([sticker]);

    const response = await request(app).get('/api/v1/ogq/stickers');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ stickers: [sticker] });
    expect(service.fetchOgqStickers).toHaveBeenCalledWith(12);
  });

  it('limit 쿼리를 그대로 서비스에 넘긴다', async () => {
    vi.mocked(service.fetchOgqStickers).mockResolvedValue([]);

    await request(app).get('/api/v1/ogq/stickers?limit=5');

    expect(service.fetchOgqStickers).toHaveBeenCalledWith(5);
  });

  it('범위를 벗어난 limit은 400으로 거부한다', async () => {
    const response = await request(app).get('/api/v1/ogq/stickers?limit=100');

    expect(response.status).toBe(400);
    expect(service.fetchOgqStickers).not.toHaveBeenCalled();
  });

  it('OGQ 연동이 꺼져 있으면 503을 전달한다', async () => {
    const { AppError } = await import('../../src/errors/app-error.js');
    vi.mocked(service.fetchOgqStickers).mockRejectedValue(new AppError('OGQ_NOT_CONFIGURED'));

    const response = await request(app).get('/api/v1/ogq/stickers');

    expect(response.status).toBe(503);
  });
});
