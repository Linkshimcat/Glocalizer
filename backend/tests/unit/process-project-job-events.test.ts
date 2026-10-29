import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/pipelines/localization.pipeline.js', () => ({ runLocalizationPipeline: vi.fn() }));
vi.mock('../../src/analytics/analytics.service.js', () => ({ recordJobEvent: vi.fn() }));
vi.mock('../../src/repositories/asset.repository.js', () => ({ findAssetsByIds: vi.fn(), updateAsset: vi.fn() }));
vi.mock('../../src/services/ocr-review.service.js', () => ({ createOcrRegionAndReprocess: vi.fn(), reviseOcrAndReprocess: vi.fn() }));
vi.mock('../../src/repositories/storage.repository.js', () => ({ withStorageDownloadCache: (work: () => Promise<unknown>) => work() }));

const { handleProcessProjectJob } = await import('../../src/workers/process-project.job.js');
const pipeline = await import('../../src/pipelines/localization.pipeline.js');
const analytics = await import('../../src/analytics/analytics.service.js');
const assets = await import('../../src/repositories/asset.repository.js');

const job = (payload: Record<string, unknown> = {}) => ({ id: 'job-1', project_id: 'project-1', payload, attempts: 1 }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(pipeline.runLocalizationPipeline).mockResolvedValue({ projectId: 'project-1', status: 'completed', completedAssetCount: 22, failedAssetCount: 2 });
  vi.mocked(assets.findAssetsByIds).mockResolvedValue([]);
});

describe('handleProcessProjectJob 분석 이벤트', () => {
  it('프로젝트 전체 처리는 시작·완료 이벤트를 남기고, 완료에는 소요 시간과 완료된 이미지 수를 담는다', async () => {
    await handleProcessProjectJob(job());
    const calls = vi.mocked(analytics.recordJobEvent).mock.calls;
    expect(calls.map(([, name]) => name)).toEqual(['localization_started', 'localization_completed']);
    expect(calls[1]![2]).toEqual({ durationMs: expect.any(Number), imageCount: 22 });
    expect(calls[1]![2]!.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('이미지 한 장 재시도·수정 작업은 현지화 1회로 세지 않는다', async () => {
    await handleProcessProjectJob(job({ assetId: 'asset-1', operation: 'retry' }));
    expect(analytics.recordJobEvent).not.toHaveBeenCalled();
  });

  it('파이프라인이 실패하면 완료 이벤트 없이 오류를 그대로 올린다', async () => {
    vi.mocked(pipeline.runLocalizationPipeline).mockRejectedValue(new Error('boom'));
    await expect(handleProcessProjectJob(job())).rejects.toThrow('boom');
    expect(vi.mocked(analytics.recordJobEvent).mock.calls.map(([, name]) => name)).toEqual(['localization_started']);
  });
});
