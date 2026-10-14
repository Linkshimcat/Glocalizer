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

it('returns 400 for malformed JSON without echoing its password', async () => {
  const response = await request(app).post('/api/v1/auth/login').set('Content-Type', 'application/json').send('{"password":"synthetic-secret",');
  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe('INVALID_REQUEST');
  expect(JSON.stringify(response.body)).not.toContain('synthetic-secret');
});
it('returns 413 for a body exceeding the limit', async () => {
  const response = await request(app).post('/api/v1/auth/login').send({ password: 'x'.repeat(1024 * 1024 + 1) });
  expect(response.status).toBe(413);
  expect(response.body.error.code).toBe('FILE_TOO_LARGE');
});
