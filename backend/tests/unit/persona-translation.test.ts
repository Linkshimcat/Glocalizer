import { beforeEach, describe, expect, it, vi } from 'vitest';

const provider = vi.hoisted(() => ({ name: 'test-provider', model: 'test-model', localizeBatch: vi.fn() }));

vi.mock('../../src/config/env.js', () => ({ env: { AI_CONCURRENCY: 2, MAX_REGENERATE_COUNT: 3, LOG_LEVEL: 'silent' } }));
vi.mock('../../src/translation/translation-provider.js', () => ({ getTranslationProvider: () => provider }));
vi.mock('../../src/repositories/ocr.repository.js', () => ({ findRegionById: vi.fn(), findRegionsByAssetId: vi.fn() }));
vi.mock('../../src/repositories/asset.repository.js', () => ({ findAssetsByProjectAndStatus: vi.fn(), updateAsset: vi.fn() }));
vi.mock('../../src/repositories/project.repository.js', () => ({ findProjectById: vi.fn(), updateProjectStage: vi.fn() }));
vi.mock('../../src/repositories/translation.repository.js', () => ({ findTranslation: vi.fn(), incrementRegenerateCount: vi.fn(), upsertTranslation: vi.fn() }));

const ocrRepo = await import('../../src/repositories/ocr.repository.js');
const assetRepo = await import('../../src/repositories/asset.repository.js');
const projectRepo = await import('../../src/repositories/project.repository.js');
const { regenerateTranslation, runProjectTranslations } = await import('../../src/ai/localization/localization.service.js');

const PERSONA = { personality: '수줍은 고양이', speechStyle: '말끝을 흐리는 반말', age: '10대', avoidExpressions: ['욕설'] };
const options = { tone: 'cute', audience: 'general', translationStyle: 'natural', highQualityReview: false };
const region = (assetId: string) => ({ id: `${assetId}-r1`, asset_id: assetId, detected_text: '안녕', contains_korean: true, bbox: { x: 0, y: 0, width: 100, height: 30 } });

beforeEach(() => {
  vi.clearAllMocks();
  provider.localizeBatch.mockImplementation(async (input) => new Map([['en', {
    sourceText: input.sourceText, targetLanguage: 'en',
    candidates: [{ text: 'Hi', tone: 't', meaning: 'm', best: true }, { text: 'Hey', tone: 't', meaning: 'm', best: false }, { text: 'Hello', tone: 't', meaning: 'm', best: false }],
    recommendedStyle: { fontCategory: 'cute', alignment: 'center', strokeRecommended: false, shadowRecommended: false },
  }]]));
  vi.mocked(ocrRepo.findRegionsByAssetId).mockImplementation(async (assetId) => [region(assetId)] as never);
});

describe('페르소나 번역 반영', () => {
  it('프로젝트의 모든 에셋 번역에 같은 페르소나를 넘긴다 (세트 전체 일관성)', async () => {
    vi.mocked(projectRepo.findProjectById).mockResolvedValue({ id: 'p1', target_languages: ['en'], localization_options: options, persona: PERSONA } as never);
    vi.mocked(assetRepo.findAssetsByProjectAndStatus).mockResolvedValue([{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }] as never);
    await runProjectTranslations('p1');
    const personas = provider.localizeBatch.mock.calls.map(([input]) => input.context.persona);
    expect(personas).toHaveLength(3);
    expect(personas.every((persona) => JSON.stringify(persona) === JSON.stringify(PERSONA))).toBe(true);
  });

  it('페르소나가 없으면 context에 persona를 싣지 않는다', async () => {
    vi.mocked(projectRepo.findProjectById).mockResolvedValue({ id: 'p1', target_languages: ['en'], localization_options: options, persona: null } as never);
    vi.mocked(assetRepo.findAssetsByProjectAndStatus).mockResolvedValue([{ id: 'a1' }] as never);
    await runProjectTranslations('p1');
    expect(provider.localizeBatch.mock.calls[0]![0].context).not.toHaveProperty('persona');
  });

  it('에디터에서 번역을 다시 만들 때도 프로젝트 페르소나를 쓴다', async () => {
    vi.mocked(projectRepo.findProjectById).mockResolvedValue({ id: 'p1', target_languages: ['en'], localization_options: options, persona: PERSONA } as never);
    vi.mocked(ocrRepo.findRegionById).mockResolvedValue(region('a1') as never);
    await regenerateTranslation('p1', 'a1', 'a1-r1', 'en', {});
    expect(provider.localizeBatch.mock.calls[0]![0].context.persona).toEqual(PERSONA);
  });
});
