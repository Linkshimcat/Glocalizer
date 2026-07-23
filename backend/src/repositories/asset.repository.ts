import { supabase } from '../config/supabase.js';
import { unwrapList, unwrapVoid } from '../utils/db-result.js';
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
  const result = await supabase
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

  return unwrapList<AssetRow>(result, '이미지 정보를 저장하지 못했습니다.');
}

export async function findAssetsByIds(projectId: string, assetIds: string[]): Promise<AssetRow[]> {
  const result = await supabase.from('assets').select().eq('project_id', projectId).in('id', assetIds);
  return unwrapList<AssetRow>(result, '이미지 조회에 실패했습니다.');
}

export async function findAssetsByProjectId(projectId: string): Promise<AssetRow[]> {
  const result = await supabase.from('assets').select().eq('project_id', projectId).order('created_at', { ascending: true });
  return unwrapList<AssetRow>(result, '이미지 조회에 실패했습니다.');
}

export async function findAssetsByProjectAndStatus(projectId: string, statuses: AssetStatus[]): Promise<AssetRow[]> {
  const result = await supabase.from('assets').select().eq('project_id', projectId).in('status', statuses);
  return unwrapList<AssetRow>(result, '이미지 조회에 실패했습니다.');
}

export interface AssetUpdate {
  status: AssetStatus;
  stage?: string | null;
  progress?: number;
  width?: number;
  height?: number;
  hasAlpha?: boolean;
  cleanedPath?: string | null;
  cleanupMethod?: string | null;
  cleanupQuality?: string | null;
  needsManualCleanup?: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export async function updateAsset(assetId: string, patch: AssetUpdate): Promise<void> {
  const result = await supabase
    .from('assets')
    .update({
      status: patch.status,
      ...(patch.stage !== undefined ? { stage: patch.stage } : {}),
      ...(patch.progress !== undefined ? { progress: patch.progress } : {}),
      ...(patch.width !== undefined ? { width: patch.width } : {}),
      ...(patch.height !== undefined ? { height: patch.height } : {}),
      ...(patch.hasAlpha !== undefined ? { has_alpha: patch.hasAlpha } : {}),
      ...(patch.cleanedPath !== undefined ? { cleaned_path: patch.cleanedPath } : {}),
      ...(patch.cleanupMethod !== undefined ? { cleanup_method: patch.cleanupMethod } : {}),
      ...(patch.cleanupQuality !== undefined ? { cleanup_quality: patch.cleanupQuality } : {}),
      ...(patch.needsManualCleanup !== undefined ? { needs_manual_cleanup: patch.needsManualCleanup } : {}),
      error_code: patch.errorCode ?? null,
      error_message: patch.errorMessage ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assetId);

  unwrapVoid(result, '이미지 상태를 갱신하지 못했습니다.');
}
