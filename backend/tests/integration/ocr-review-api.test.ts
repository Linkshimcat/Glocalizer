import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/repositories/project.repository.js', () => ({ findProjectById: vi.fn() }));
vi.mock('../../src/repositories/job.repository.js', () => ({ findActiveJobForProject: vi.fn(), insertJob: vi.fn() }));
vi.mock('../../src/repositories/asset.repository.js', () => ({ findAssetsByIds: vi.fn(), updateAsset: vi.fn(), findAssetsByProjectAndStatus: vi.fn(), findAssetsByProjectId: vi.fn() }));
vi.mock('../../src/repositories/ocr.repository.js', () => ({ updatePrimaryRegion: vi.fn(), findPrimaryRegion: vi.fn(), findRegionsByAssetId: vi.fn(), findRegionById: vi.fn(), replaceOcrRegions: vi.fn() }));
vi.mock('../../src/repositories/translation.repository.js', () => ({ deleteTranslationsByOcrRegionId: vi.fn(), findTranslation: vi.fn(), incrementRegenerateCount: vi.fn(), upsertTranslation: vi.fn(), findTranslationsByOcrRegionId: vi.fn() }));
vi.mock('../../src/repositories/storage.repository.js', () => ({ removeFromStorage: vi.fn(), downloadFromStorage: vi.fn(), uploadToStorage: vi.fn(), createSignedUrl: vi.fn() }));
vi.mock('../../src/ai/localization/localization.service.js', () => ({ regenerateTranslation: vi.fn(), runTranslationsForAsset: vi.fn().mockResolvedValue({ status: 'translating' }) }));
vi.mock('../../src/image/cleanup.service.js', () => ({ runCleanupForAsset: vi.fn().mockResolvedValue({}) }));
vi.mock('../../src/repositories/editor-state.repository.js', () => ({ upsertEditorState: vi.fn(), findEditorStatesByAssetId: vi.fn() }));
vi.mock('../../src/workers/job-runner.js', () => ({ processClaimedJob: vi.fn() }));

const { createApp } = await import('../../src/app.js');
const projectRepo = await import('../../src/repositories/project.repository.js');
const jobRepo = await import('../../src/repositories/job.repository.js');
const assetRepo = await import('../../src/repositories/asset.repository.js');
const ocrRepo = await import('../../src/repositories/ocr.repository.js');
const jobRunner = await import('../../src/workers/job-runner.js');
const { hashProjectToken } = await import('../../src/utils/hash.js');
const app = createApp();
const projectId = 'e5f6a7b8-c9d0-4e5f-9a0b-1c2d3e4f5a6b';
const assetId = 'f6a7b8c9-d0e1-4f5a-8b9c-2d3e4f5a6b7c';
const token = 'ocr-review-test-token';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(jobRepo.findActiveJobForProject).mockResolvedValue(null);
  vi.mocked(projectRepo.findProjectById).mockResolvedValue({ id: projectId, access_token_hash: hashProjectToken(token), target_languages: ['en'], localization_options: {} } as never);
  const asset = { id: assetId, project_id: projectId, width: 400, height: 200, cleaned_path: null, status: 'completed' };
  vi.mocked(assetRepo.findAssetsByIds).mockResolvedValue([asset] as never);
  vi.mocked(assetRepo.findAssetsByProjectId).mockResolvedValue([{ ...asset, status: 'ocr' }] as never);
  vi.mocked(jobRepo.insertJob).mockResolvedValue({ id: 'ocr-reprocess-job', status: 'running' } as never);
  vi.mocked(ocrRepo.updatePrimaryRegion).mockResolvedValue({ id: 'a7b8c9d0-e1f2-4a5b-9c0d-3e4f5a6b7c8d' } as never);
});

describe('PATCH /api/v1/projects/:projectId/assets/:assetId/ocr', () => {
  it('requires a project token', async () => {
    const response = await request(app).patch(`/api/v1/projects/${projectId}/assets/${assetId}/ocr`).send({ text: '킹받았죠?', normalizedBox: { x: 0.1, y: 0.1, width: 0.5, height: 0.2 } });
    expect(response.status).toBe(401);
  });

  it('updates one asset OCR and schedules only that asset for reprocessing', async () => {
    const response = await request(app).patch(`/api/v1/projects/${projectId}/assets/${assetId}/ocr`).set('X-Project-Token', token).send({ text: '킹받았죠?', normalizedBox: { x: 0.1, y: 0.1, width: 0.5, height: 0.2 } });
    expect(response.status).toBe(202);
    expect(response.body).toEqual({ assetId, status: 'reprocessing', jobId: 'ocr-reprocess-job' });
    expect(ocrRepo.updatePrimaryRegion).toHaveBeenCalledWith(assetId, expect.objectContaining({ text: '킹받았죠?', box: { x: 40, y: 20, width: 200, height: 40 } }));
    expect(jobRunner.processClaimedJob).toHaveBeenCalledWith(expect.objectContaining({ id: 'ocr-reprocess-job' }));
  });

  it('project job이 진행 중이면 OCR 수정으로 상태가 경합하지 않도록 거부한다', async () => {
    vi.mocked(jobRepo.findActiveJobForProject).mockResolvedValue({ id: 'running-job' } as never);

    const response = await request(app)
      .patch(`/api/v1/projects/${projectId}/assets/${assetId}/ocr`)
      .set('X-Project-Token', token)
      .send({ text: '킹받았죠?', normalizedBox: { x: 0.1, y: 0.1, width: 0.5, height: 0.2 } });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('PROCESS_ALREADY_RUNNING');
    expect(ocrRepo.updatePrimaryRegion).not.toHaveBeenCalled();
  });

  it('rejects a box outside image bounds', async () => {
    const response = await request(app).patch(`/api/v1/projects/${projectId}/assets/${assetId}/ocr`).set('X-Project-Token', token).send({ text: '아자스', normalizedBox: { x: 0.8, y: 0.1, width: 0.5, height: 0.2 } });
    expect(response.status).toBe(400);
  });

  it('rounded manual cleanup style을 저장한다', async () => {
    const regionId = 'a7b8c9d0-e1f2-4a5b-9c0d-3e4f5a6b7c8d';
    vi.mocked(ocrRepo.findRegionById).mockResolvedValue({ id: regionId, asset_id: assetId } as never);
    const response = await request(app)
      .put(`/api/v1/projects/${projectId}/assets/${assetId}/editor-state`)
      .set('X-Project-Token', token)
      .send({
        languageCode: 'en',
        regionId,
        style: { manualCleanup: { mode: 'solid', color: '#ffffff', radius: 0.35, rect: { x: 0.1, y: 0.1, width: 0.5, height: 0.2 } } },
      });

    expect(response.status).toBe(204);
  });

  it('manual cleanup radius 범위를 검증한다', async () => {
    const response = await request(app)
      .put(`/api/v1/projects/${projectId}/assets/${assetId}/editor-state`)
      .set('X-Project-Token', token)
      .send({
        languageCode: 'en',
        regionId: 'a7b8c9d0-e1f2-4a5b-9c0d-3e4f5a6b7c8d',
        style: { manualCleanup: { mode: 'solid', radius: 0.7, rect: { x: 0.1, y: 0.1, width: 0.5, height: 0.2 } } },
      });

    expect(response.status).toBe(400);
  });
});
