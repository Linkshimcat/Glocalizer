import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/repositories/project.repository.js', () => ({
  insertProject: vi.fn(),
  findProjectById: vi.fn(),
  updateProjectStage: vi.fn(),
  deleteProjectRow: vi.fn(),
  findExpiredProjects: vi.fn(),
}));

vi.mock('../../src/repositories/asset.repository.js', () => ({
  insertAssets: vi.fn(),
  findAssetsByIds: vi.fn(),
  findAssetsByProjectId: vi.fn(),
  findAssetsByProjectAndStatus: vi.fn(),
  updateAsset: vi.fn(),
}));

vi.mock('../../src/repositories/storage.repository.js', () => ({
  downloadFromStorage: vi.fn(),
  uploadToStorage: vi.fn(),
  createSignedUrl: vi.fn(),
  removeFromStorage: vi.fn(),
}));

vi.mock('../../src/config/supabase.js', () => ({
  supabase: {
    storage: {
      from: () => ({
        createSignedUploadUrl: vi.fn().mockResolvedValue({ data: { token: 'signed-token' }, error: null }),
      }),
    },
  },
  ensureStorageBucket: vi.fn(),
}));

const { createApp } = await import('../../src/app.js');
const projectRepo = await import('../../src/repositories/project.repository.js');
const assetRepo = await import('../../src/repositories/asset.repository.js');
const storageRepo = await import('../../src/repositories/storage.repository.js');
const { hashProjectToken } = await import('../../src/utils/hash.js');

const app = createApp();

const PROJECT_ID = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
const TOKEN = 'test-project-token';

function fakeProject(overrides: Record<string, unknown> = {}) {
  return {
    id: PROJECT_ID,
    access_token_hash: hashProjectToken(TOKEN),
    status: 'created',
    stage: null,
    progress: 0,
    target_languages: ['en'],
    localization_options: { tone: 'cute', audience: 'general', translationStyle: 'natural', highQualityReview: false },
    error_code: null,
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/v1/projects', () => {
  it('필수 필드가 없으면 400 INVALID_REQUEST를 반환한다', async () => {
    const res = await request(app).post('/api/v1/projects').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
  });

  it('targetLanguages에 지원하지 않는 언어가 있으면 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .send({ targetLanguages: ['fr'], files: [{ clientId: 'f1', name: 'a.png', mimeType: 'image/png', size: 1000 }] });
    expect(res.status).toBe(400);
  });

  it('유효한 요청은 201과 함께 projectId/uploadToken을 반환한다', async () => {
    vi.mocked(projectRepo.insertProject).mockResolvedValue(fakeProject());
    vi.mocked(assetRepo.insertAssets).mockResolvedValue([]);

    const res = await request(app)
      .post('/api/v1/projects')
      .send({
        targetLanguages: ['en', 'ja'],
        options: { tone: 'funny', audience: 'teen', translationStyle: 'trendy', highQualityReview: false },
        files: [{ clientId: 'f1', name: 'emoji.png', mimeType: 'image/png', size: 12345 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.projectId).toBe(PROJECT_ID);
    expect(res.body.assets).toHaveLength(1);
    expect(res.body.assets[0].uploadToken).toBe('signed-token');
    expect(res.body.projectToken).toBeTruthy();
  });
});

describe('DELETE /api/v1/projects/:projectId', () => {
  it('X-Project-Token 헤더가 없으면 401을 반환한다', async () => {
    const res = await request(app).delete(`/api/v1/projects/${PROJECT_ID}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_PROJECT_TOKEN');
  });

  it('토큰이 틀리면 401을 반환한다', async () => {
    vi.mocked(projectRepo.findProjectById).mockResolvedValue(fakeProject());
    const res = await request(app).delete(`/api/v1/projects/${PROJECT_ID}`).set('X-Project-Token', 'wrong-token');
    expect(res.status).toBe(401);
  });

  it('존재하지 않는 프로젝트면 404를 반환한다', async () => {
    vi.mocked(projectRepo.findProjectById).mockResolvedValue(null);
    const res = await request(app).delete(`/api/v1/projects/${PROJECT_ID}`).set('X-Project-Token', TOKEN);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PROJECT_NOT_FOUND');
  });

  it('올바른 토큰이면 204와 함께 삭제하고, Storage 파일도 함께 지운다', async () => {
    vi.mocked(projectRepo.findProjectById).mockResolvedValue(fakeProject());
    vi.mocked(assetRepo.findAssetsByProjectId).mockResolvedValue([
      { original_path: 'projects/x/original/a.png', cleaned_path: 'projects/x/cleaned/a.png' } as never,
    ]);

    const res = await request(app).delete(`/api/v1/projects/${PROJECT_ID}`).set('X-Project-Token', TOKEN);

    expect(res.status).toBe(204);
    expect(storageRepo.removeFromStorage).toHaveBeenCalledWith(['projects/x/original/a.png', 'projects/x/cleaned/a.png']);
    expect(projectRepo.deleteProjectRow).toHaveBeenCalledWith(PROJECT_ID);
  });

  it('만료된 프로젝트는 404를 반환한다', async () => {
    vi.mocked(projectRepo.findProjectById).mockResolvedValue(fakeProject({ expires_at: new Date(Date.now() - 1000).toISOString() }));
    const res = await request(app).delete(`/api/v1/projects/${PROJECT_ID}`).set('X-Project-Token', TOKEN);
    expect(res.status).toBe(404);
  });
});
