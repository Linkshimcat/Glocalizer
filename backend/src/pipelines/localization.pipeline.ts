import { runProjectOcr } from '../ai/ocr/ocr.service.js';
import { runProjectTranslations } from '../ai/localization/localization.service.js';
import { runProjectCleanup } from '../image/cleanup.service.js';
import { findAssetsByProjectId } from '../repositories/asset.repository.js';
import { updateProjectStage } from '../repositories/project.repository.js';

export interface PipelineOutcome {
  projectId: string;
  status: 'completed' | 'failed';
  completedAssetCount: number;
  failedAssetCount: number;
}

/**
 * 프로젝트 하나에 대해 OCR → 번역(+검수) → 이미지 정리를 순서대로 실행한다.
 * 각 단계는 이미지별 부분 실패를 스스로 처리하므로, 여기서는 단계 사이의 progress 체크포인트와
 * 최종 프로젝트 상태(전부 실패했는지 아닌지)만 책임진다.
 */
export async function runLocalizationPipeline(projectId: string): Promise<PipelineOutcome> {
  await updateProjectStage(projectId, { status: 'processing', stage: 'validating', progress: 0 });

  await updateProjectStage(projectId, { stage: 'ocr', progress: 5 });
  await runProjectOcr(projectId);

  await updateProjectStage(projectId, { stage: 'translating', progress: 30 });
  await runProjectTranslations(projectId);

  await updateProjectStage(projectId, { stage: 'cleaning', progress: 80 });
  await runProjectCleanup(projectId);

  await updateProjectStage(projectId, { stage: 'saving', progress: 95 });

  const assets = await findAssetsByProjectId(projectId);
  const completedAssetCount = assets.filter((asset) => asset.status === 'completed').length;
  const failedAssetCount = assets.filter((asset) => asset.status === 'failed').length;
  const finalStatus: PipelineOutcome['status'] = completedAssetCount > 0 ? 'completed' : 'failed';

  await updateProjectStage(projectId, {
    status: finalStatus,
    stage: 'completed',
    progress: 100,
    ...(finalStatus === 'failed'
      ? { errorMessage: '모든 이미지 처리에 실패했습니다. 이미지별 오류를 확인해주세요.' }
      : {}),
  });

  return { projectId, status: finalStatus, completedAssetCount, failedAssetCount };
}
