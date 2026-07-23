import { supabase } from '../config/supabase.js';
import { unwrapVoid } from '../utils/db-result.js';

interface UpsertEditorStateInput {
  assetId: string;
  ocrRegionId: string;
  languageCode: string;
  style: Record<string, unknown>;
}

export interface EditorStateRow {
  asset_id: string;
  ocr_region_id: string;
  language_code: string;
  style: Record<string, unknown>;
}

export async function findEditorStatesByAssetId(assetId: string): Promise<EditorStateRow[]> {
  const result = await supabase
    .from('editor_states')
    .select('asset_id, ocr_region_id, language_code, style')
    .eq('asset_id', assetId);
  if (result.error) throw result.error;
  return (result.data ?? []) as EditorStateRow[];
}

export async function upsertEditorState(input: UpsertEditorStateInput): Promise<void> {
  const result = await supabase.from('editor_states').upsert(
    {
      asset_id: input.assetId,
      ocr_region_id: input.ocrRegionId,
      language_code: input.languageCode,
      style: input.style,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'asset_id,ocr_region_id,language_code' },
  );

  unwrapVoid(result, '편집 상태 저장에 실패했습니다.');
}
