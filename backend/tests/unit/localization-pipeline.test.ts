import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/ai/localization/localization.service.js', () => ({ runProjectTranslations: vi.fn() }));
vi.mock('../../src/image/cleanup.service.js', () => ({ runProjectCleanup: vi.fn() }));
vi.mock('../../src/ocr/ocr-pipeline.service.js', () => ({ runOcrPipeline: vi.fn() }));
vi.mock('../../src/ocr/font-style-pipeline.service.js', () => ({ runProjectFontStyleAnalysis: vi.fn() }));
vi.mock('../../src/repositories/asset.repository.js', () => ({ findAssetsByProjectId: vi.fn() }));
vi.mock('../../src/repositories/project.repository.js', () => ({ updateProjectStage: vi.fn() }));

const assetRepo = await import('../../src/repositories/asset.repository.js');
const projectRepo = await import('../../src/repositories/project.repository.js');
const localizationService = await import('../../src/ai/localization/localization.service.js');
const fontStyleService = await import('../../src/ocr/font-style-pipeline.service.js');
const { runLocalizationPipeline } = await import('../../src/pipelines/localization.pipeline.js');

describe('runLocalizationPipeline final state', () => {
  beforeEach(() => vi.clearAllMocks());

  it('모든 asset 실패 시 대표 asset의 오류 code와 message를 project에 남긴다', async () => {
    vi.mocked(assetRepo.findAssetsByProjectId).mockResolvedValue([
      { status: 'failed', error_code: 'OCR_TEXT_NOT_FOUND', error_message: '텍스트를 찾지 못했습니다.' },
    ] as never);

    await expect(runLocalizationPipeline('project-1')).resolves.toMatchObject({ status: 'failed', failedAssetCount: 1 });

    expect(projectRepo.updateProjectStage).toHaveBeenLastCalledWith('project-1', {
      status: 'failed',
      stage: 'completed',
      progress: 100,
      errorCode: 'OCR_TEXT_NOT_FOUND',
      errorMessage: '텍스트를 찾지 못했습니다.',
    });
  });

  it('성공한 재처리 뒤에는 기존 project 오류를 명시적으로 지운다', async () => {
    vi.mocked(assetRepo.findAssetsByProjectId).mockResolvedValue([
      { status: 'completed', error_code: null, error_message: null },
    ] as never);

    await expect(runLocalizationPipeline('project-1')).resolves.toMatchObject({ status: 'completed', completedAssetCount: 1 });

    expect(projectRepo.updateProjectStage).toHaveBeenLastCalledWith('project-1', {
      status: 'completed',
      stage: 'completed',
      progress: 100,
      errorCode: null,
      errorMessage: null,
    });
  });

  it('Groq 한도 충돌을 피하려고 번역 완료 후 폰트 분석을 시작한다', async () => {
    vi.mocked(assetRepo.findAssetsByProjectId).mockResolvedValue([
      { status: 'completed', error_code: null, error_message: null },
    ] as never);

    await runLocalizationPipeline('project-1');

    const translationOrder = vi.mocked(localizationService.runProjectTranslations).mock.invocationCallOrder[0];
    const fontStyleOrder = vi.mocked(fontStyleService.runProjectFontStyleAnalysis).mock.invocationCallOrder[0];
    expect(translationOrder).toBeLessThan(fontStyleOrder);
  });

  it('OCR·번역·정리 단계마다 걸린 시간을 재서 돌려준다', async () => {
    vi.mocked(assetRepo.findAssetsByProjectId).mockResolvedValue([{ status: 'completed', error_code: null, error_message: null }] as never);
    const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
    const ocr = await import('../../src/ocr/ocr-pipeline.service.js');
    const cleanup = await import('../../src/image/cleanup.service.js');
    vi.mocked(ocr.runOcrPipeline).mockImplementation(() => wait(30) as never);
    vi.mocked(localizationService.runProjectTranslations).mockImplementation(() => wait(30) as never);
    vi.mocked(fontStyleService.runProjectFontStyleAnalysis).mockImplementation(() => wait(30) as never);
    vi.mocked(cleanup.runProjectCleanup).mockImplementation(() => wait(30) as never);

    const { stageDurationsMs } = await runLocalizationPipeline('project-1');

    expect(Object.keys(stageDurationsMs).sort()).toEqual(['cleaning', 'recognizing', 'translating']);
    expect(stageDurationsMs.recognizing).toBeGreaterThanOrEqual(25);
    expect(stageDurationsMs.cleaning).toBeGreaterThanOrEqual(25);
    // 번역 단계는 번역과 폰트 분석을 합친 구간이라 두 작업보다 길다.
    expect(stageDurationsMs.translating).toBeGreaterThanOrEqual(55);
  });
});
