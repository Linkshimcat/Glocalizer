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
const { localizeRegionForLanguages, runTranslationsForAsset } = await import('../../src/ai/localization/localization.service.js');

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
    let failedOnce = false;
    provider.localizeBatch.mockImplementation(async input => {
      if (input.sourceText === '잼얘해줘' && !failedOnce) {
        failedOnce = true;
        throw new Error('one caption failed');
      }
      return translation(input.sourceText);
    });
  });

  it('실패한 캡션 언어만 개별 재시도해 모든 영역을 저장한다', async () => {
    const result = await runTranslationsForAsset(
      { id: 'asset-1', project_id: 'project-1' } as never,
      ['en'],
      { tone: 'funny', audience: 'teen', translationStyle: 'trendy', highQualityReview: false },
    );

    expect(provider.localizeBatch).toHaveBeenCalledTimes(4);
    expect(provider.localizeBatch.mock.calls[0][0].context.siblingCaptions).toEqual(['잼얘해줘', '당신이 잼얘를 끊어온지 오래됐기 때문에']);
    expect(translationRepo.upsertTranslation).toHaveBeenCalledTimes(3);
    expect(result.status).toBe('translating');
    expect(result.languages).toEqual([{ languageCode: 'en', status: 'translated', needsReview: false }]);
    expect(assetRepo.updateAsset).toHaveBeenLastCalledWith('asset-1', { status: 'translating', stage: 'translating', progress: 100 });
  });

  it('재시도 후에도 한 OCR 영역이 실패하면 이미지를 완료 단계로 넘기지 않는다', async () => {
    provider.localizeBatch.mockImplementation(async input => {
      if (input.sourceText === '잼얘해줘') throw new Error('persistent caption failure');
      return translation(input.sourceText);
    });

    const result = await runTranslationsForAsset(
      { id: 'asset-1', project_id: 'project-1' } as never,
      ['en'],
      { tone: 'funny', audience: 'teen', translationStyle: 'trendy', highQualityReview: false },
    );

    expect(result.status).toBe('failed');
    expect(result.languages).toEqual([expect.objectContaining({ languageCode: 'en', status: 'failed' })]);
    expect(result.errorMessage).toContain('3개 OCR 영역 중 1개 영역');
    expect(translationRepo.upsertTranslation).toHaveBeenCalledTimes(2);
    expect(assetRepo.updateAsset).toHaveBeenLastCalledWith('asset-1', expect.objectContaining({
      status: 'failed',
      stage: 'translating',
      errorCode: 'TRANSLATION_PROVIDER_FAILED',
    }));
  });

  it('묶음 요청 실패 뒤 언어별 재시도를 동시에 보내지 않는다', async () => {
    let activeRequests = 0;
    let maxActiveRequests = 0;
    provider.localizeBatch.mockImplementation(async input => {
      if (input.targetLanguages.length > 1) throw new Error('batch failed');
      activeRequests += 1;
      maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
      await new Promise(resolve => setTimeout(resolve, 5));
      activeRequests -= 1;
      const languageCode = input.targetLanguages[0];
      const text = languageCode === 'en' ? 'Tell me' : languageCode === 'ja' ? '話して' : '说吧';
      return new Map([[languageCode, {
        sourceText: input.sourceText,
        targetLanguage: languageCode,
        candidates: [{ text, tone: 'casual', meaning: '말해줘', best: true }],
        recommendedStyle: { fontCategory: 'bold', alignment: 'center', strokeRecommended: false, shadowRecommended: false },
      }]]);
    });

    const results = await localizeRegionForLanguages(
      regions[0] as never,
      ['en', 'ja', 'zh'],
      { tone: 'funny', audience: 'teen', translationStyle: 'trendy', highQualityReview: false },
    );

    expect(maxActiveRequests).toBe(1);
    expect(results.every(result => result.status === 'translated')).toBe(true);
  });
});
