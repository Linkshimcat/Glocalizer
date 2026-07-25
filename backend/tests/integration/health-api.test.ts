import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/repositories/health.repository.js', () => ({ checkServiceDependencies: vi.fn() }));

const { createApp } = await import('../../src/app.js');
const healthRepo = await import('../../src/repositories/health.repository.js');
const app = createApp();

describe('GET /api/v1/health/ready', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Supabase DB와 storage가 준비되면 200 ready를 반환한다', async () => {
    vi.mocked(healthRepo.checkServiceDependencies).mockResolvedValue({ database: true, storage: true });

    const response = await request(app).get('/api/v1/health/ready');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ready', dependencies: { database: true, storage: true } });
  });

  it('의존성이 하나라도 실패하면 503을 반환한다', async () => {
    vi.mocked(healthRepo.checkServiceDependencies).mockResolvedValue({ database: true, storage: false });

    const response = await request(app).get('/api/v1/health/ready');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ status: 'unavailable', dependencies: { database: true, storage: false } });
  });
});
