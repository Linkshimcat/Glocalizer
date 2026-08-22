import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/repositories/project.repository.js', () => ({
  insertProject: vi.fn(),
  findProjectById: vi.fn(),
  updateProjectStage: vi.fn(),
  deleteProjectRow: vi.fn(),
  findExpiredProjects: vi.fn(),
}));

vi.mock('../../src/repositories/download.repository.js', () => ({
  insertDownloadEvent: vi.fn(),
  countDownloadEvents: vi.fn(),
}));

const { createApp } = await import('../../src/app.js');
const projectRepo = await import('../../src/repositories/project.repository.js');
const downloadRepo = await import('../../src/repositories/download.repository.js');
const { hashProjectToken } = await import('../../src/utils/hash.js');

const app = createApp();

const PROJECT_ID = 'e5f6a7b8-c9d0-4e5f-9a0b-1c2d3e4f5a6b';
const TOKEN = 'download-test-token';

function fakeProject() {
  return {
    id: PROJECT_ID,
    access_token_hash: hashProjectToken(TOKEN),
    status: 'completed',
    stage: 'completed',
    progress: 100,
    target_languages: ['en'],
    localization_options: {},
    error_code: null,
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(projectRepo.findProjectById).mockResolvedValue(fakeProject() as never);
});

describe('POST /api/v1/projects/:projectId/downloads', () => {
  it('다운로드 완료 이벤트를 기록하고 204를 반환한다', async () => {
    vi.mocked(downloadRepo.insertDownloadEvent).mockResolvedValue(undefined);

    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/downloads`)
      .set('X-Project-Token', TOKEN)
      .send({ kind: 'single', languageCode: 'en' });

    expect(res.status).toBe(204);
    expect(downloadRepo.insertDownloadEvent).toHaveBeenCalledWith(PROJECT_ID, 'single', 'en');
  });

  it('zip 다운로드는 languageCode 없이 기록한다', async () => {
    vi.mocked(downloadRepo.insertDownloadEvent).mockResolvedValue(undefined);

    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/downloads`)
      .set('X-Project-Token', TOKEN)
      .send({ kind: 'zip' });

    expect(res.status).toBe(204);
    expect(downloadRepo.insertDownloadEvent).toHaveBeenCalledWith(PROJECT_ID, 'zip', null);
  });

  it('잘못된 kind는 400을 반환한다', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/downloads`)
      .set('X-Project-Token', TOKEN)
      .send({ kind: 'invalid' });

    expect(res.status).toBe(400);
    expect(downloadRepo.insertDownloadEvent).not.toHaveBeenCalled();
  });

  it('토큰이 없으면 401을 반환한다', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/downloads`)
      .send({ kind: 'single', languageCode: 'en' });

    expect(res.status).toBe(401);
    expect(downloadRepo.insertDownloadEvent).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/downloads/count', () => {
  it('올바른 관리자 키가 있으면 종류별 집계와 총합을 반환한다', async () => {
    vi.mocked(downloadRepo.countDownloadEvents).mockResolvedValue({ total: 3, byKind: { single: 2, zip: 1 } });

    const res = await request(app)
      .get('/api/v1/downloads/count')
      .set('X-Admin-Key', process.env.DOWNLOAD_STATS_API_KEY!);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total: 3, byKind: { single: 2, zip: 1 } });
  });

  it('관리자 키가 없으면 401을 반환한다', async () => {
    const res = await request(app).get('/api/v1/downloads/count');

    expect(res.status).toBe(401);
    expect(downloadRepo.countDownloadEvents).not.toHaveBeenCalled();
  });

  it('관리자 키가 틀리면 401을 반환한다', async () => {
    const res = await request(app)
      .get('/api/v1/downloads/count')
      .set('X-Admin-Key', 'wrong-key');

    expect(res.status).toBe(401);
    expect(downloadRepo.countDownloadEvents).not.toHaveBeenCalled();
  });
});
