import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { supabase } from '../config/supabase.js';
import { AppError } from '../errors/app-error.js';
import { findAssetsByProjectId, insertAssets } from '../repositories/asset.repository.js';
import { deleteProjectRow, findProjectById, insertProject } from '../repositories/project.repository.js';
import { removeFromStorage } from '../repositories/storage.repository.js';
import type { CreateProjectInput } from '../schemas/project.schema.js';
import { generateProjectToken, hashProjectToken } from '../utils/hash.js';
import { mapWithConcurrency } from '../utils/concurrency.js';

const MIME_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
};
const SIGNED_UPLOAD_URL_CONCURRENCY = 4;

interface CreatedAsset {
  assetId: string;
  clientId: string;
  uploadUrl: string;
}

interface CreateProjectResult {
  projectId: string;
  projectToken: string;
  expiresAt: string;
  assets: CreatedAsset[];
}

export async function createProject(input: CreateProjectInput): Promise<CreateProjectResult> {
  const projectToken = generateProjectToken();
  const expiresAt = new Date(Date.now() + env.PROJECT_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
  let projectId: string | null = null;

  try {
    const project = await insertProject({
      accessTokenHash: hashProjectToken(projectToken),
      targetLanguages: input.targetLanguages,
      localizationOptions: input.options,
      expiresAt,
    });
    projectId = project.id;

    const plannedAssets = input.files.map((file) => ({
      id: randomUUID(),
      clientId: file.clientId,
      originalName: file.name,
      mimeType: file.mimeType,
      byteSize: file.size,
      originalPath: `projects/${project.id}/original/${randomUUID()}.${MIME_EXTENSIONS[file.mimeType]}`,
    }));

    await insertAssets(
      plannedAssets.map((asset) => ({
        id: asset.id,
        projectId: project.id,
        clientId: asset.clientId,
        originalName: asset.originalName,
        mimeType: asset.mimeType,
        byteSize: asset.byteSize,
        originalPath: asset.originalPath,
      })),
    );

    // 스토리지 URL 발급은 파일끼리 독립적이다. 최대 20개를 직렬 처리하지 않되,
    // 동시 요청을 제한해 Supabase에 순간적으로 과도한 부하를 주지 않는다.
    const assets = await mapWithConcurrency(plannedAssets, SIGNED_UPLOAD_URL_CONCURRENCY, async (asset): Promise<CreatedAsset> => {
      const { data, error } = await supabase.storage
        .from(env.SUPABASE_STORAGE_BUCKET)
        .createSignedUploadUrl(asset.originalPath);

      if (error || !data) {
        throw new AppError('INTERNAL_ERROR', { cause: error?.message }, '업로드 URL 생성에 실패했습니다.');
      }

      const uploadUrl = data.signedUrl.startsWith('http')
        ? data.signedUrl
        : `${env.SUPABASE_URL}/storage/v1${data.signedUrl}`;

      return {
        assetId: asset.id,
        clientId: asset.clientId,
        uploadUrl,
      };
    });

    return {
      projectId: project.id,
      projectToken,
      expiresAt,
      assets,
    };
  } catch (error) {
    // Signed URL은 응답이 성공한 뒤에만 브라우저가 받는다. 응답 전 실패에서는 파일이 업로드될 수
    // 없으므로 FK cascade로 project와 계획된 asset 행만 정리하면 된다.
    if (projectId) {
      try {
        await deleteProjectRow(projectId);
      } catch (cleanupError) {
        logger.error({ err: cleanupError, projectId }, '프로젝트 생성 실패 후 DB 정리 실패');
      }
    }
    throw error;
  }
}

/** DB 삭제는 FK cascade로 assets/ocr_regions/translations/jobs/editor_states까지 함께 지워지지만, Storage 파일은 별도로 지워야 한다. */
export async function deleteProjectAndAssets(projectId: string): Promise<void> {
  const project = await findProjectById(projectId);
  if (!project) {
    throw new AppError('PROJECT_NOT_FOUND', { projectId });
  }

  const assets = await findAssetsByProjectId(projectId);
  const paths = assets.flatMap((asset) => [asset.original_path, asset.cleaned_path].filter((path): path is string => Boolean(path)));

  await removeFromStorage(paths);
  await deleteProjectRow(projectId);
}
