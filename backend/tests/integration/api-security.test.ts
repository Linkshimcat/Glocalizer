import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/repositories/project.repository.js', () => ({
  findProjectById: vi.fn(),
  findExpiredProjects: vi.fn(),
}));
vi.mock('../../src/repositories/asset.repository.js', () => ({ findAssetsByProjectId: vi.fn() }));

const { createApp } = await import('../../src/app.js');
const app = createApp();

describe('API security defaults', () => {
  it('health 응답에 API 보안 헤더와 no-store 정책을 적용한다', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
  });
});
