import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/services/showcase.service.js', () => ({ listLandingShowcases: vi.fn() }));

const { createApp } = await import('../../src/app.js');
const service = await import('../../src/services/showcase.service.js');
const app = createApp();

describe('GET /api/v1/landing/showcases', () => {
  beforeEach(() => vi.clearAllMocks());

  it('인증 없이 승인된 공개 사례만 반환한다', async () => {
    const showcase = {
      id: 'case-1', kind: 'localization', languageCode: 'en',
      originalUrl: 'https://storage.test/signed/original.png',
      resultUrl: 'https://storage.test/signed/localized.png', sortOrder: 1,
    };
    vi.mocked(service.listLandingShowcases).mockResolvedValue([showcase]);

    const response = await request(app).get('/api/v1/landing/showcases');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ showcases: [showcase] });
    expect(response.headers['cache-control']).toContain('max-age=60');
    expect(service.listLandingShowcases).toHaveBeenCalledOnce();
  });
});
