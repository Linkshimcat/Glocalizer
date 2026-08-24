import { beforeEach, describe, expect, it, vi } from 'vitest';

const provider = vi.hoisted(() => ({
  name: 'test-provider',
  model: 'test-model',
  localizeBatch: vi.fn(),
}));

vi.mock('../../src/config/env.js', () => ({ env: { AI_CONCURRENCY: 2, MAX_REGENERATE_COUNT: 3, LOG_LEVEL: 'silent' } }));
vi.mock('../../src/translation/translation-provider.js', () => ({ getTranslationProvider: () => provider }));
vi.mock('../../src/repositories/ocr.repository.js', () => ({ findRegionById: vi.fn(), findRegionsByAssetId: vi.fn() }));
vi.mock('../../src/repositories/asset.repository.js', () => ({ findAssetsByProjectAndStatus: vi.fn(), updateAsset: vi.fn() }));
vi.mock('../../src/repositories/project.repository.js', () => ({ findProjectById: vi.fn(), updateProjectStage: vi.fn() }));
vi.mock('../../src/repositories/translation.repository.js', () => ({
  findTranslation: vi.fn(),
  incrementRegenerateCount: vi.fn(),
  upsertTranslation: vi.fn(),
}));

const ocrRepo = await import('../../src/repositories/ocr.repository.js');
const assetRepo = await import('../../src/repositories/asset.repository.js');
const translationRepo = await import('../../src/repositories/translation.repository.js');
const { runTranslationsForAsset } = await import('../../src/ai/localization/localization.service.js');

const regions = ['잼얘 요구권', '잼얘해줘', '당신이 잼얘를 끊어온지 오래됐기 때문에'].map((text, index) => ({
  id: `region-${index + 1}`,
  asset_id: 'asset-1',
  detected_text: text,
  contains_korean: true,
  bbox: { x: 10, y: 10 + index * 40, width: 120, height: 30 },
}));

function translation(sourceText: string) {
  return new Map([['en', {
    sourceText,
    targetLanguage: 'en',
    candidates: [
      { text: 'Tell me!', tone: 'trendy', meaning: '말해줘', best: true },
      { text: 'Story time', tone: 'casual', meaning: '이야기 시간', best: false },
      { text: 'Spill it', tone: 'funny', meaning: '어서 말해', best: false },
    ],
    recommendedStyle: { fontCategory: 'bold', alignment: 'center', strokeRecommended: false, shadowRecommended: false },
  }]]);
}

describe('runTranslationsForAsset multi-region behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ocrRepo.findRegionsByAssetId).mockResolvedValue(regions as never);
    provider.localizeBatch.mockImplementation(async input => {
      if (input.sourceText === '잼얘해줘') throw new Error('one caption failed');
      return translation(input.sourceText);
    });
  });

  it('translates every caption independently and continues after one caption fails', async () => {
    const result = await runTranslationsForAsset(
      { id: 'asset-1', project_id: 'project-1' } as never,
      ['en'],
      { tone: 'funny', audience: 'teen', translationStyle: 'trendy', highQualityReview: false },
    );

    expect(provider.localizeBatch).toHaveBeenCalledTimes(3);
    expect(provider.localizeBatch.mock.calls[0][0].context.siblingCaptions).toEqual(['잼얘해줘', '당신이 잼얘를 끊어온지 오래됐기 때문에']);
    expect(translationRepo.upsertTranslation).toHaveBeenCalledTimes(2);
    expect(result.status).toBe('translating');
    expect(result.languages).toEqual([{ languageCode: 'en', status: 'translated', needsReview: true }]);
    expect(assetRepo.updateAsset).toHaveBeenLastCalledWith('asset-1', { status: 'translating', stage: 'translating', progress: 100 });
  });
});
