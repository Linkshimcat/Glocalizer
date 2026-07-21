import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import sharp from 'sharp';

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

const { createApp } = await import('../../src/app.js');
const projectRepo = await import('../../src/repositories/project.repository.js');
const assetRepo = await import('../../src/repositories/asset.repository.js');
const storageRepo = await import('../../src/repositories/storage.repository.js');
const { hashProjectToken } = await import('../../src/utils/hash.js');

const app = createApp();

const PROJECT_ID = 'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e';
const ASSET_ID = 'c3d4e5f6-a7b8-4c5d-8e9f-0a1b2c3d4e5f';
const TOKEN = 'upload-test-token';

function fakeProject() {
  return {
    id: PROJECT_ID,
    access_token_hash: hashProjectToken(TOKEN),
    status: 'created',
    stage: null,
    progress: 0,
    target_languages: ['en'],
    localization_options: {},
    error_code: null,
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

function fakeAsset(overrides: Record<string, unknown> = {}) {
  return {
    id: ASSET_ID,
    project_id: PROJECT_ID,
    client_id: 'f1',
    original_name: 'a.png',
    mime_type: 'image/png',
    byte_size: 1000,
    width: null,
    height: null,
    has_alpha: null,
    original_path: `projects/${PROJECT_ID}/original/${ASSET_ID}.png`,
    preprocessed_path: null,
    cleaned_path: null,
    status: 'pending_upload',
    stage: null,
    progress: 0,
    cleanup_method: null,
    cleanup_quality: null,
    needs_manual_cleanup: false,
    error_code: null,
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(projectRepo.findProjectById).mockResolvedValue(fakeProject() as never);
});

describe('POST /api/v1/projects/:projectId/uploads/complete', () => {
  it('토큰이 없으면 401을 반환한다', async () => {
    const res = await request(app).post(`/api/v1/projects/${PROJECT_ID}/uploads/complete`).send({ assetIds: [ASSET_ID] });
    expect(res.status).toBe(401);
  });

  it('assetIds가 UUID 배열이 아니면 400을 반환한다', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/uploads/complete`)
      .set('X-Project-Token', TOKEN)
      .send({ assetIds: ['not-a-uuid'] });
    expect(res.status).toBe(400);
  });

  it('프로젝트에 속하지 않는 assetId는 실패로 표시된다 (200, 개별 실패)', async () => {
    vi.mocked(assetRepo.findAssetsByIds).mockResolvedValue([]);

    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/uploads/complete`)
      .set('X-Project-Token', TOKEN)
      .send({ assetIds: [ASSET_ID] });

    expect(res.status).toBe(200);
    expect(res.body.assets[0]).toMatchObject({ assetId: ASSET_ID, status: 'failed', errorCode: 'INVALID_REQUEST' });
  });

  it('정상 이미지는 실제로 디코딩해서 크기를 기록하고 uploaded로 표시한다', async () => {
    const png = await sharp({ create: { width: 64, height: 32, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .png()
      .toBuffer();

    vi.mocked(assetRepo.findAssetsByIds).mockResolvedValue([fakeAsset()] as never);
    vi.mocked(storageRepo.downloadFromStorage).mockResolvedValue(png);

    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/uploads/complete`)
      .set('X-Project-Token', TOKEN)
      .send({ assetIds: [ASSET_ID] });

    expect(res.status).toBe(200);
    expect(res.body.assets[0]).toMatchObject({ assetId: ASSET_ID, status: 'uploaded' });
    expect(assetRepo.updateAsset).toHaveBeenCalledWith(
      ASSET_ID,
      expect.objectContaining({ status: 'uploaded', width: 64, height: 32 }),
    );
  });

  it('손상된(디코딩 불가) 이미지는 실패로 표시하고 IMAGE_DECODE_FAILED를 남긴다', async () => {
    vi.mocked(assetRepo.findAssetsByIds).mockResolvedValue([fakeAsset()] as never);
    vi.mocked(storageRepo.downloadFromStorage).mockResolvedValue(Buffer.from('not a real image'));

    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/uploads/complete`)
      .set('X-Project-Token', TOKEN)
      .send({ assetIds: [ASSET_ID] });

    expect(res.status).toBe(200);
    expect(res.body.assets[0]).toMatchObject({ assetId: ASSET_ID, status: 'failed', errorCode: 'IMAGE_DECODE_FAILED' });
  });
});
