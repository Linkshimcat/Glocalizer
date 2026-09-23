import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { supabase } from '../config/supabase.js';
import { AppError } from '../errors/app-error.js';
import { deleteDraftAssets, findAssetsByProjectId, insertAssets } from '../repositories/asset.repository.js';
import { findProjectsByOwner, updateDraftProject } from '../repositories/project.repository.js';
import { createSignedUrl, removeFromStorage } from '../repositories/storage.repository.js';
import type { DraftProjectInput } from '../schemas/project.schema.js';
import type { ProjectRow } from '../types/project.js';
import { mapWithConcurrency } from '../utils/concurrency.js';
import { createProject } from './project.service.js';
import { getProjectResults } from './result.service.js';
import { getProjectStatus } from './processing.service.js';

export async function createDraft(input: DraftProjectInput, ownerId: string) {
  if (!input.files.length) throw new AppError('INVALID_REQUEST', undefined, '이미지를 먼저 선택해주세요.');
  return createProject(input, ownerId, input.selectedClientIds);
}

export async function updateDraft(project: ProjectRow, input: DraftProjectInput) {
  if (!project.owner_id || project.status !== 'created') throw new AppError('INVALID_REQUEST', undefined, '업로드 초안만 변경할 수 있습니다.');
  const existing = await findAssetsByProjectId(project.id);
  for (const file of input.files) {
    const asset = existing.find(asset => asset.client_id === file.clientId);
    if (asset && (asset.original_name !== file.name || asset.mime_type !== file.mimeType || asset.byte_size !== file.size)) {
      throw new AppError('INVALID_REQUEST', undefined, '기존 이미지의 정보를 변경할 수 없습니다.');
    }
  }
  await updateDraftProject(project.id, input.targetLanguages, input.selectedClientIds);
  const newAssets = input.files.filter(file => !existing.some(asset => asset.client_id === file.clientId)).map(file => ({
    id: randomUUID(), projectId: project.id, clientId: file.clientId, originalName: file.name,
    mimeType: file.mimeType, byteSize: file.size,
    originalPath: `projects/${project.id}/original/${randomUUID()}.${file.mimeType === 'image/png' ? 'png' : 'jpg'}`,
  }));
  if (newAssets.length) await insertAssets(newAssets);
  const removed = existing.filter(asset => !input.files.some(file => file.clientId === asset.client_id));
  // Drop only images the user removed from this upload draft, never another project's assets.
  await removeFromStorage(removed.flatMap(asset => asset.original_path ? [asset.original_path] : []));
  await deleteDraftAssets(project.id, removed.map(asset => asset.id));
  const assets = await findAssetsByProjectId(project.id);
  return {
    projectId: project.id, projectToken: 'account',
    assets: await mapWithConcurrency(assets, 4, async asset => {
      if (asset.status === 'uploaded') return { assetId: asset.id, clientId: asset.client_id, uploadUrl: null };
      const { data, error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).createSignedUploadUrl(asset.original_path!, { upsert: true });
      if (error || !data) throw new AppError('INTERNAL_ERROR', undefined, '업로드 URL 생성에 실패했습니다.');
      return { assetId: asset.id, clientId: asset.client_id, uploadUrl: data.signedUrl.startsWith('http') ? data.signedUrl : `${env.SUPABASE_URL}/storage/v1${data.signedUrl}` };
    }),
  };
}

export async function listWorkspaces(ownerId: string) {
  const projects = await findProjectsByOwner(ownerId);
  return mapWithConcurrency(projects, 4, async project => {
    const assets = await findAssetsByProjectId(project.id);
    const visible = project.status === 'created' || !project.selected_client_ids ? assets : assets.filter(asset => project.selected_client_ids!.includes(asset.client_id ?? ''));
    return {
      id: project.id, name: project.name ?? visible[0]?.original_name ?? 'Untitled', status: project.status,
      resultReady: project.result_ready ?? false, targetLanguages: project.target_languages,
      imageCount: visible.length, createdAt: project.created_at, updatedAt: project.updated_at,
      thumbnailUrl: visible[0]?.original_path ? await createSignedUrl(visible[0].original_path) : null,
    };
  });
}

export async function restoreWorkspace(project: ProjectRow) {
  const [results, status, assets] = await Promise.all([getProjectResults(project.id), getProjectStatus(project.id), findAssetsByProjectId(project.id)]);
  return {
    projectId: project.id, projectToken: 'account', resultReady: project.result_ready ?? false,
    selectedClientIds: project.selected_client_ids ?? assets.map(asset => asset.client_id ?? asset.id),
    files: assets.map(asset => ({ id: asset.client_id ?? asset.id, assetId: asset.id, name: asset.original_name, type: asset.mime_type, size: asset.byte_size })),
    results, status,
  };
}
