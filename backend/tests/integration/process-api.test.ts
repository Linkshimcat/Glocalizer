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

vi.mock('../../src/repositories/job.repository.js', () => ({
  insertJob: vi.fn(),
  findActiveJobForProject: vi.fn(),
  claimNextQueuedJob: vi.fn(),
  markJobCompleted: vi.fn(),
  markJobFailedOrRequeue: vi.fn(),
}));

const { createApp } = await import('../../src/app.js');
const projectRepo = await import('../../src/repositories/project.repository.js');
const assetRepo = await import('../../src/repositories/asset.repository.js');
const jobRepo = await import('../../src/repositories/job.repository.js');
const { hashProjectToken } = await import('../../src/utils/hash.js');

const app = createApp();

const PROJECT_ID = 'd4e5f6a7-b8c9-4d5e-8f9a-0b1c2d3e4f5a';
const TOKEN = 'process-test-token';

function fakeProject(overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(projectRepo.findProjectById).mockResolvedValue(fakeProject() as never);
});

describe('POST /api/v1/projects/:projectId/process', () => {
  it('업로드된 이미지가 없으면 409 UPLOAD_NOT_COMPLETED를 반환한다', async () => {
    vi.mocked(jobRepo.findActiveJobForProject).mockResolvedValue(null);
    vi.mocked(assetRepo.findAssetsByProjectId).mockResolvedValue([]);

    const res = await request(app).post(`/api/v1/projects/${PROJECT_ID}/process`).set('X-Project-Token', TOKEN);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('UPLOAD_NOT_COMPLETED');
  });

  it('이미 처리 중인 job이 있으면 409 PROCESS_ALREADY_RUNNING을 반환한다', async () => {
    vi.mocked(jobRepo.findActiveJobForProject).mockResolvedValue({ id: 'job-1', status: 'running' } as never);

    const res = await request(app).post(`/api/v1/projects/${PROJECT_ID}/process`).set('X-Project-Token', TOKEN);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PROCESS_ALREADY_RUNNING');
  });

  it('업로드된 이미지가 있으면 202와 함께 job을 생성한다', async () => {
    vi.mocked(jobRepo.findActiveJobForProject).mockResolvedValue(null);
    vi.mocked(assetRepo.findAssetsByProjectId).mockResolvedValue([{ status: 'uploaded' }] as never);
    vi.mocked(jobRepo.insertJob).mockResolvedValue({ id: 'job-1', status: 'queued' } as never);

    const res = await request(app).post(`/api/v1/projects/${PROJECT_ID}/process`).set('X-Project-Token', TOKEN);

    expect(res.status).toBe(202);
    expect(res.body).toEqual({ jobId: 'job-1', status: 'queued' });
  });
});

describe('GET /api/v1/projects/:projectId/status', () => {
  it('진행 중인 프로젝트의 상태와 이미지별 진행률을 반환한다', async () => {
    vi.mocked(projectRepo.findProjectById).mockResolvedValue(
      fakeProject({ status: 'processing', stage: 'translating', progress: 42 }) as never,
    );
    vi.mocked(assetRepo.findAssetsByProjectId).mockResolvedValue([
      { id: 'asset-1', status: 'ocr', progress: 100, error_code: null, error_message: null },
      { id: 'asset-2', status: 'failed', progress: 0, error_code: 'OCR_TEXT_NOT_FOUND', error_message: '텍스트 없음' },
    ] as never);

    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}/status`).set('X-Project-Token', TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.stage).toBe('translating');
    expect(res.body.progress).toBe(42);
    expect(res.body.message).toBe('현지 표현으로 번역하고 있어요');
    expect(res.body.assets[1]).toMatchObject({ assetId: 'asset-2', status: 'failed', errorCode: 'OCR_TEXT_NOT_FOUND' });
  });

  it('존재하지 않는 프로젝트는 404를 반환한다', async () => {
    vi.mocked(projectRepo.findProjectById).mockResolvedValue(null);
    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}/status`).set('X-Project-Token', TOKEN);
    expect(res.status).toBe(404);
  });
});
