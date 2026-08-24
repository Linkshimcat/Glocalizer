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
});
