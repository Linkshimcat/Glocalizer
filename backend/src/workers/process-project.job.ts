import { runLocalizationPipeline } from '../pipelines/localization.pipeline.js';
import type { JobRow } from '../types/job.js';

export async function handleProcessProjectJob(job: JobRow): Promise<void> {
  await runLocalizationPipeline(job.project_id);
}
