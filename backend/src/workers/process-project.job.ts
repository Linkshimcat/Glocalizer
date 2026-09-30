import { runLocalizationPipeline } from '../pipelines/localization.pipeline.js';
import { withStorageDownloadCache } from '../repositories/storage.repository.js';
import type { JobRow } from '../types/job.js';

export async function handleProcessProjectJob(job: JobRow): Promise<void> {
  await withStorageDownloadCache(() => runLocalizationPipeline(job.project_id));
}
