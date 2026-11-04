import { beforeEach, describe, expect, it, vi } from 'vitest';

const provider = vi.hoisted(() => ({ name: 'test-provider', model: 'test-model', localizeBatch: vi.fn() }));

vi.mock('../../src/config/env.js', () => ({ env: { AI_CONCURRENCY: 2, MAX_REGENERATE_COUNT: 3, LOG_LEVEL: 'silent' } }));
vi.mock('../../src/translation/translation-provider.js', () => ({ getTranslationProvider: () => provider }));
vi.mock('../../src/repositories/ocr.repository.js', () => ({ findRegionById: vi.fn(), findRegionsByAssetId: vi.fn() }));
vi.mock('../../src/repositories/asset.repository.js', () => ({ findAssetsByIds: vi.fn(), findAssetsByProjectAndStatus: vi.fn(), updateAsset: vi.fn() }));
vi.mock('../../src/repositories/project.repository.js', () => ({ findProjectById: vi.fn(), updateProjectStage: vi.fn() }));
vi.mock('../../src/repositories/translation.repository.js', () => ({ findTranslation: vi.fn(), incrementRegenerateCount: vi.fn(), upsertTranslation: vi.fn() }));

const ocrRepo = await import('../../src/repositories/ocr.repository.js');
const assetRepo = await import('../../src/repositories/asset.repository.js');
const projectRepo = await import('../../src/repositories/project.repository.js');
const translationRepo = await import('../../src/repositories/translation.repository.js');
const { AppError } = await import('../../src/errors/app-error.js');
const { regenerateTranslation } = await import('../../src/ai/localization/localization.service.js');

const options = { tone: 'cute', audience: 'general', translationStyle: 'natural', highQualityReview: false };
const otherProjectRegion = { id: 'b1-r1', asset_id: 'b1', detected_text: '안녕', contains_korean: true, bbox: { x: 0, y: 0, width: 100, height: 30 } };

beforeEach(() => {
  vi.clearAllMocks();
  provider.localizeBatch.mockImplementation(async (input) => new Map([['en', {
    sourceText: input.sourceText, targetLanguage: 'en',
    candidates: [{ text: 'Hi', tone: 't', meaning: 'm', best: true }, { text: 'Hey', tone: 't', meaning: 'm', best: false }, { text: 'Hello', tone: 't', meaning: 'm', best: false }],
    recommendedStyle: { fontCategory: 'cute', alignment: 'center', strokeRecommended: false, shadowRecommended: false },
  }]]));
  vi.mocked(projectRepo.findProjectById).mockResolvedValue({ id: 'pA', target_languages: ['en'], localization_options: options, persona: null } as never);
  vi.mocked(ocrRepo.findRegionById).mockResolvedValue(otherProjectRegion as never);
  vi.mocked(ocrRepo.findRegionsByAssetId).mockResolvedValue([otherProjectRegion] as never);
});

describe('번역 다시 만들기의 프로젝트 범위 확인', () => {
  it('URL의 프로젝트에 속하지 않는 이미지(다른 프로젝트의 assetId·regionId)는 번역을 만들거나 덮어쓰지 않고 거절한다', async () => {
    // 프로젝트 A 기준으로 조회하면 B의 이미지는 나오지 않는다.
    vi.mocked(assetRepo.findAssetsByIds).mockResolvedValue([] as never);

    await expect(regenerateTranslation('pA', 'b1', 'b1-r1', 'en', {})).rejects.toBeInstanceOf(AppError);
    expect(provider.localizeBatch).not.toHaveBeenCalled();
    expect(translationRepo.upsertTranslation).not.toHaveBeenCalled();
    expect(translationRepo.incrementRegenerateCount).not.toHaveBeenCalled();
  });

  it('프로젝트에 속한 이미지는 지금처럼 번역을 다시 만든다', async () => {
    vi.mocked(assetRepo.findAssetsByIds).mockResolvedValue([{ id: 'b1' }] as never);

    await regenerateTranslation('pA', 'b1', 'b1-r1', 'en', {});
    expect(assetRepo.findAssetsByIds).toHaveBeenCalledWith('pA', ['b1']);
    expect(provider.localizeBatch).toHaveBeenCalledTimes(1);
  });
});
