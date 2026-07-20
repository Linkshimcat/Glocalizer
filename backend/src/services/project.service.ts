import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { AppError } from '../errors/app-error.js';
import { insertAssets } from '../repositories/asset.repository.js';
import { insertProject } from '../repositories/project.repository.js';
import type { CreateProjectInput } from '../schemas/project.schema.js';
import { generateProjectToken, hashProjectToken } from '../utils/hash.js';

const MIME_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

interface CreatedAsset {
  assetId: string;
  clientId: string;
  uploadPath: string;
  uploadToken: string;
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

    assets.push({
      assetId: asset.id,
      clientId: asset.clientId,
      uploadPath: asset.originalPath,
      uploadToken: data.token,
    });
  }

  return {
    projectId: project.id,
    projectToken,
    expiresAt,
    assets,
  };
}
