import { supabase } from '../config/supabase.js';
import { unwrapList, unwrapNullableRow, unwrapVoid } from '../utils/db-result.js';
import type { OcrRegion, OcrRegionRow } from '../types/ocr.js';

export async function replaceOcrRegions(assetId: string, regions: OcrRegion[]): Promise<void> {
  const deleteResult = await supabase.from('ocr_regions').delete().eq('asset_id', assetId);
  unwrapVoid(deleteResult, 'OCR 결과 초기화에 실패했습니다.');

  if (regions.length === 0) return;

  const insertResult = await supabase.from('ocr_regions').insert(
    regions.map((region) => ({
      id: region.id,
      asset_id: assetId,
      detected_text: region.text,
      confidence: region.confidence,
      bbox: region.box,
      normalized_bbox: region.normalizedBox,
      polygon: region.polygon,
      contains_korean: region.containsKorean,
      is_primary: region.isPrimary,
      reading_order: region.readingOrder,
    })),
  );

  unwrapVoid(insertResult, 'OCR 결과 저장에 실패했습니다.');
}

export async function findPrimaryRegion(assetId: string): Promise<OcrRegionRow | null> {
  const result = await supabase.from('ocr_regions').select().eq('asset_id', assetId).eq('is_primary', true).maybeSingle();
  return unwrapNullableRow<OcrRegionRow>(result, 'OCR 대표 영역 조회에 실패했습니다.');
}

export async function findRegionsByAssetId(assetId: string): Promise<OcrRegionRow[]> {
  const result = await supabase.from('ocr_regions').select().eq('asset_id', assetId).order('reading_order');
  return unwrapList<OcrRegionRow>(result, 'OCR 영역 조회에 실패했습니다.');
}

export async function findRegionById(regionId: string): Promise<OcrRegionRow | null> {
  const result = await supabase.from('ocr_regions').select().eq('id', regionId).maybeSingle();
  return unwrapNullableRow<OcrRegionRow>(result, 'OCR 영역 조회에 실패했습니다.');
}
