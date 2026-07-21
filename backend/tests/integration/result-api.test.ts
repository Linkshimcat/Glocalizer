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

vi.mock('../../src/repositories/ocr.repository.js', () => ({
  replaceOcrRegions: vi.fn(),
  findPrimaryRegion: vi.fn(),
  findRegionsByAssetId: vi.fn(),
  findRegionById: vi.fn(),
}));

vi.mock('../../src/repositories/translation.repository.js', () => ({
  upsertTranslation: vi.fn(),
  findTranslationsByOcrRegionId: vi.fn(),
  findTranslation: vi.fn(),
  incrementRegenerateCount: vi.fn(),
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
const ocrRepo = await import('../../src/repositories/ocr.repository.js');
const translationRepo = await import('../../src/repositories/translation.repository.js');
const storageRepo = await import('../../src/repositories/storage.repository.js');
const { hashProjectToken } = await import('../../src/utils/hash.js');

const app = createApp();

const PROJECT_ID = 'e5f6a7b8-c9d0-4e5f-9a0b-1c2d3e4f5a6b';
const ASSET_ID = 'f6a7b8c9-d0e1-4f5a-8b9c-2d3e4f5a6b7c';
const REGION_ID = 'a7b8c9d0-e1f2-4a5b-9c0d-3e4f5a6b7c8d';
const TOKEN = 'result-test-token';

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

describe('GET /api/v1/projects/:projectId/results', () => {
  it('존재하지 않는 프로젝트는 404를 반환한다', async () => {
    vi.mocked(projectRepo.findProjectById).mockResolvedValue(null);
    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}/results`).set('X-Project-Token', TOKEN);
    expect(res.status).toBe(404);
  });

  it('OCR/번역/cleanup 결과를 하나로 조립해서 반환한다', async () => {
    vi.mocked(assetRepo.findAssetsByProjectId).mockResolvedValue([
      {
        id: ASSET_ID,
        original_name: 'test.png',
        mime_type: 'image/png',
        width: 300,
        height: 150,
        status: 'completed',
        original_path: 'projects/x/original/a.png',
        cleaned_path: 'projects/x/cleaned/a.png',
        cleanup_method: 'transparent-mask',
        cleanup_quality: 'good',
        needs_manual_cleanup: false,
        error_code: null,
        error_message: null,
      },
    ] as never);

    vi.mocked(ocrRepo.findRegionsByAssetId).mockResolvedValue([
      {
        id: REGION_ID,
        detected_text: '완전좋아',
        confidence: 0.93,
        bbox: { x: 10, y: 10, width: 100, height: 50 },
        is_primary: true,
      },
    ] as never);

    vi.mocked(translationRepo.findTranslationsByOcrRegionId).mockResolvedValue([
      {
        language_code: 'en',
        final_candidates: [{ text: 'Loving it!', tone: 'trendy', meaning: '완전 좋다', best: true }],
        recommended_style: { fontCategory: 'bold', alignment: 'center', strokeRecommended: true, shadowRecommended: false },
      },
    ] as never);

    vi.mocked(storageRepo.createSignedUrl).mockResolvedValue('https://signed.example/url');

    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}/results`).set('X-Project-Token', TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.assets[0].ocr.fullText).toBe('완전좋아');
    expect(res.body.assets[0].ocr.primaryRegionId).toBe(REGION_ID);
    expect(res.body.assets[0].localizations.en.candidates[0].text).toBe('Loving it!');
    expect(res.body.assets[0].cleanup).toEqual({ method: 'transparent-mask', quality: 'good', needsManualCleanup: false });
    expect(res.body.assets[0].originalUrl).toBe('https://signed.example/url');
  });
});
