import { findAssetsByIds, updateAsset } from '../repositories/asset.repository.js';
import { createOcrRegionAndReprocess, reviseOcrAndReprocess } from '../services/ocr-review.service.js';
import type { PixelBox } from '../utils/bbox.js';
import { runLocalizationPipeline } from '../pipelines/localization.pipeline.js';
import { withStorageDownloadCache } from '../repositories/storage.repository.js';
import type { JobRow } from '../types/job.js';

export async function handleProcessProjectJob(job: JobRow): Promise<void> {
  await withStorageDownloadCache(async () => {
    const payload = job.payload ?? {};
    if (typeof payload.assetId === 'string') {
      const [asset] = await findAssetsByIds(job.project_id, [payload.assetId]);
      // A completed target survives recovery and must not be edited again.
      if (asset && !(job.attempts > 1 && asset.status === 'completed')) {
        if (payload.operation === 'retry') await updateAsset(asset.id, { status: job.initial_states?.[asset.id] === 'ocr' ? 'ocr' : 'uploaded', stage: 'retrying', progress: 0, cleanedPath: null, cleanupMethod: null, cleanupQuality: null, needsManualCleanup: false });
        else if (payload.operation === 'revise') await reviseOcrAndReprocess(job.project_id, asset.id, payload.text as string, payload.normalizedBox as PixelBox, payload.regionId as string);
        else if (payload.operation === 'create') await createOcrRegionAndReprocess(job.project_id, asset.id, payload.text as string, payload.normalizedBox as PixelBox, payload.regionId as string);
      }
    }
    await runLocalizationPipeline(job.project_id);
  });
}
