import { recordJobEvent } from '../analytics/analytics.service.js';
import { findAssetsByIds, updateAsset } from '../repositories/asset.repository.js';
import { createOcrRegionAndReprocess, reviseOcrAndReprocess } from '../services/ocr-review.service.js';
import type { PixelBox } from '../utils/bbox.js';
import { runLocalizationPipeline } from '../pipelines/localization.pipeline.js';
import { withStorageDownloadCache } from '../repositories/storage.repository.js';
import type { JobRow } from '../types/job.js';

export async function handleProcessProjectJob(job: JobRow): Promise<void> {
  await withStorageDownloadCache(async () => {
    const payload = job.payload ?? {};
    // 이미지 한 장 재시도·수정은 현지화 1회로 세지 않는다. 프로젝트 전체 처리만 Proof 지표에 남긴다.
    const tracked = typeof payload.assetId !== 'string';
    if (typeof payload.assetId === 'string') {
      const [asset] = await findAssetsByIds(job.project_id, [payload.assetId]);
      // A completed target survives recovery and must not be edited again.
      if (asset && !(job.attempts > 1 && asset.status === 'completed')) {
        if (payload.operation === 'retry') await updateAsset(asset.id, { status: job.initial_states?.[asset.id] === 'ocr' ? 'ocr' : 'uploaded', stage: 'retrying', progress: 0, cleanedPath: null, cleanupMethod: null, cleanupQuality: null, needsManualCleanup: false });
        else if (payload.operation === 'revise') await reviseOcrAndReprocess(job.project_id, asset.id, payload.text as string, payload.normalizedBox as PixelBox, payload.regionId as string);
        else if (payload.operation === 'create') await createOcrRegionAndReprocess(job.project_id, asset.id, payload.text as string, payload.normalizedBox as PixelBox, payload.regionId as string);
      }
    }
    // 소요 시간은 이번 시도 기준이다. 워커가 죽어 복구된 작업은 재시도부터 다시 잰다.
    const startedAt = Date.now();
    if (tracked) await recordJobEvent(job, 'localization_started');
    const outcome = await runLocalizationPipeline(job.project_id);
    if (tracked) await recordJobEvent(job, 'localization_completed', { durationMs: Date.now() - startedAt, imageCount: outcome.completedAssetCount });
  });
}
