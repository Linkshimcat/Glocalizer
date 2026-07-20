import { supabase } from '../config/supabase.js';
import { AppError } from '../errors/app-error.js';
import type { AssetRow, AssetStatus } from '../types/asset.js';

interface NewAssetInput {
  id: string;
  projectId: string;
  clientId?: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  originalPath: string;
}

export async function insertAssets(assets: NewAssetInput[]): Promise<AssetRow[]> {
  const { data, error } = await supabase
    .from('assets')
    .insert(
      assets.map((asset) => ({
        id: asset.id,
        project_id: asset.projectId,
        client_id: asset.clientId ?? null,
        original_name: asset.originalName,
        mime_type: asset.mimeType,
        byte_size: asset.byteSize,
        original_path: asset.originalPath,
      })),
    )
    .select();

  if (error || !data) {
    throw new AppError('INTERNAL_ERROR', { cause: error?.message }, '이미지 정보를 저장하지 못했습니다.');
  }

  return data as AssetRow[];
}

export async function findAssetsByIds(projectId: string, assetIds: string[]): Promise<AssetRow[]> {
  const { data, error } = await supabase.from('assets').select().eq('project_id', projectId).in('id', assetIds);

  if (error) {
    throw new AppError('INTERNAL_ERROR', { cause: error.message }, '이미지 조회에 실패했습니다.');
  }

  return (data as AssetRow[]) ?? [];
}

export async function findAssetsByProjectAndStatus(projectId: string, statuses: AssetStatus[]): Promise<AssetRow[]> {
  const { data, error } = await supabase.from('assets').select().eq('project_id', projectId).in('status', statuses);

  if (error) {
    throw new AppError('INTERNAL_ERROR', { cause: error.message }, '이미지 조회에 실패했습니다.');
  }

  return (data as AssetRow[]) ?? [];
}

interface AssetUpdate {
  status: AssetStatus;
  stage?: string | null;
  progress?: number;
  width?: number;
  height?: number;
  hasAlpha?: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export async function updateAsset(assetId: string, patch: AssetUpdate): Promise<void> {
  const { error } = await supabase
    .from('assets')
    .update({
      status: patch.status,
      ...(patch.stage !== undefined ? { stage: patch.stage } : {}),
      ...(patch.progress !== undefined ? { progress: patch.progress } : {}),
      ...(patch.width !== undefined ? { width: patch.width } : {}),
      ...(patch.height !== undefined ? { height: patch.height } : {}),
      ...(patch.hasAlpha !== undefined ? { has_alpha: patch.hasAlpha } : {}),
      error_code: patch.errorCode ?? null,
      error_message: patch.errorMessage ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assetId);

  if (error) {
    throw new AppError('INTERNAL_ERROR', { cause: error.message }, '이미지 상태를 갱신하지 못했습니다.');
  }
}
