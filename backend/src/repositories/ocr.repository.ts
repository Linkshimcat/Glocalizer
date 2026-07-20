import { supabase } from '../config/supabase.js';
import { AppError } from '../errors/app-error.js';
import type { OcrRegion, OcrRegionRow } from '../types/ocr.js';

export async function replaceOcrRegions(assetId: string, regions: OcrRegion[]): Promise<void> {
  const { error: deleteError } = await supabase.from('ocr_regions').delete().eq('asset_id', assetId);
  if (deleteError) {
    throw new AppError('INTERNAL_ERROR', { cause: deleteError.message }, 'OCR 결과 초기화에 실패했습니다.');
  }

  if (regions.length === 0) return;

  const { error: insertError } = await supabase.from('ocr_regions').insert(
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

  if (insertError) {
    throw new AppError('INTERNAL_ERROR', { cause: insertError.message }, 'OCR 결과 저장에 실패했습니다.');
  }
}

export async function findPrimaryRegion(assetId: string): Promise<OcrRegionRow | null> {
  const { data, error } = await supabase
    .from('ocr_regions')
    .select()
    .eq('asset_id', assetId)
    .eq('is_primary', true)
    .maybeSingle();

  if (error) {
    throw new AppError('INTERNAL_ERROR', { cause: error.message }, 'OCR 대표 영역 조회에 실패했습니다.');
  }

  return (data as OcrRegionRow) ?? null;
}
