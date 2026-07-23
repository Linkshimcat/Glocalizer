import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { AppError } from '../errors/app-error.js';
import { findAssetsByProjectId, insertAssets } from '../repositories/asset.repository.js';
import { deleteProjectRow, findProjectById, insertProject } from '../repositories/project.repository.js';
import { removeFromStorage } from '../repositories/storage.repository.js';
import type { CreateProjectInput } from '../schemas/project.schema.js';
import { generateProjectToken, hashProjectToken } from '../utils/hash.js';

const MIME_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

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

  const project = await insertProject({
    accessTokenHash: hashProjectToken(projectToken),
    targetLanguages: input.targetLanguages,
    localizationOptions: input.options,
    expiresAt,
  });

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

  const assets: CreatedAsset[] = [];
  for (const asset of plannedAssets) {
    const { data, error } = await supabase.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .createSignedUploadUrl(asset.originalPath);

    if (error || !data) {
      throw new AppError('INTERNAL_ERROR', { cause: error?.message }, '업로드 URL 생성에 실패했습니다.');
    }

    const uploadUrl = data.signedUrl.startsWith('http')
      ? data.signedUrl
      : `${env.SUPABASE_URL}/storage/v1${data.signedUrl}`;

    assets.push({
      assetId: asset.id,
      clientId: asset.clientId,
      uploadUrl,
    });
  }

  return {
    projectId: project.id,
    projectToken,
    expiresAt,
    assets,
  };
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
