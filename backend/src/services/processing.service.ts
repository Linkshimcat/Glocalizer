import { AppError } from '../errors/app-error.js';
import { findAssetsByProjectId } from '../repositories/asset.repository.js';
import { findActiveJobForProject, insertJob } from '../repositories/job.repository.js';
import { findProjectById } from '../repositories/project.repository.js';

const STAGE_MESSAGES: Record<string, string> = {
  validating: '이미지를 확인하고 있어요',
  preprocessing: '이미지를 준비하고 있어요',
  recognizing: '이미지 속 한글을 찾고 있어요',
  ocr: '이미지 속 한글을 찾고 있어요',
  translating: '현지 표현으로 번역하고 있어요',
  reviewing: '번역이 자연스러운지 확인하고 있어요',
  cleaning: '원본 글자를 정리하고 있어요',
  saving: '결과를 저장하고 있어요',
  completed: '현지화가 완료됐어요',
};

export async function createProcessingJob(projectId: string): Promise<{ jobId: string; status: string }> {
  const activeJob = await findActiveJobForProject(projectId);
  if (activeJob) {
    throw new AppError('PROCESS_ALREADY_RUNNING', { projectId, jobId: activeJob.id });
  }

  const assets = await findAssetsByProjectId(projectId);
  const uploadedCount = assets.filter((asset) => asset.status === 'uploaded').length;
  if (uploadedCount === 0) {
    throw new AppError('UPLOAD_NOT_COMPLETED', { projectId }, '처리할 이미지가 없습니다. 먼저 업로드를 완료해주세요.');
  }

  const job = await insertJob(projectId);
  return { jobId: job.id, status: job.status };
}

export interface ProjectStatusResponse {
  projectId: string;
  status: string;
  stage: string | null;
  progress: number;
  message: string;
  assets: Array<{
    assetId: string;
    status: string;
    progress: number;
    errorCode?: string;
    errorMessage?: string;
  }>;
}

export async function getProjectStatus(projectId: string): Promise<ProjectStatusResponse> {
  const project = await findProjectById(projectId);
  if (!project) {
    throw new AppError('PROJECT_NOT_FOUND', { projectId });
  }

  const assets = await findAssetsByProjectId(projectId);

  return {
    projectId: project.id,
    status: project.status,
    stage: project.stage,
    progress: project.progress,
    message: project.status === 'failed'
      ? project.error_message ?? '처리에 실패했습니다. 이미지별 오류를 확인해주세요.'
      : (project.stage && STAGE_MESSAGES[project.stage]) || '',
    assets: assets.map((asset) => ({
      assetId: asset.id,
      status: asset.status,
      progress: asset.progress,
      ...(asset.error_code ? { errorCode: asset.error_code, errorMessage: asset.error_message ?? undefined } : {}),
    })),
  };
}
