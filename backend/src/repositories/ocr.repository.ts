import { supabase } from '../config/supabase.js';
import { unwrapList, unwrapNullableRow, unwrapVoid } from '../utils/db-result.js';
import type { OcrRegion, OcrRegionRow } from '../types/ocr.js';

export async function replaceOcrRegions(assetId: string, regions: OcrRegion[]): Promise<void> {
  const deleteResult = await supabase.from('ocr_regions').delete().eq('asset_id', assetId);
  unwrapVoid(deleteResult, 'OCR 결과 초기화에 실패했습니다.');

  if (regions.length === 0) return;

  const records = regions.map((region) => ({
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
      source: region.source,
      agreement_score: region.agreementScore,
      needs_manual_review: region.needsManualReview,
    }));
  const insertResult = await supabase.from('ocr_regions').insert(records);

  // migration 010 적용 전에는 기존 OCR 흐름을 멈추지 않고 metadata만 생략한다.
  if (insertResult.error?.message.includes('agreement_score') || insertResult.error?.message.includes('needs_manual_review') || insertResult.error?.message.includes('source')) {
    const legacyResult = await supabase.from('ocr_regions').insert(records.map(({ source: _source, agreement_score: _agreementScore, needs_manual_review: _needsManualReview, ...record }) => record));
    unwrapVoid(legacyResult, 'OCR 결과 저장에 실패했습니다.');
    return;
  }

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

export async function updatePrimaryRegion(assetId: string, input: { text: string; normalizedBox: OcrRegion['normalizedBox']; box: OcrRegion['box'] }): Promise<OcrRegionRow | null> {
  const payload = {
    detected_text: input.text,
    normalized_bbox: input.normalizedBox,
    bbox: input.box,
    source: 'paddle-consensus',
    agreement_score: 1,
    needs_manual_review: false,
  };
  let result = await supabase.from('ocr_regions').update(payload).eq('asset_id', assetId).eq('is_primary', true).select().maybeSingle();
  if (result.error?.message.includes('agreement_score') || result.error?.message.includes('needs_manual_review') || result.error?.message.includes('source')) {
    const { source: _source, agreement_score: _agreementScore, needs_manual_review: _needsManualReview, ...legacyPayload } = payload;
    result = await supabase.from('ocr_regions').update(legacyPayload).eq('asset_id', assetId).eq('is_primary', true).select().maybeSingle();
  }
  return unwrapNullableRow<OcrRegionRow>(result, '수정한 OCR 문구를 저장하지 못했습니다.');
}
