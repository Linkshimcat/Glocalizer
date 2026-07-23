import { supabase } from '../config/supabase.js';
import { unwrapList, unwrapNullableRow, unwrapVoid } from '../utils/db-result.js';
import type { RecommendedStyle, TargetLanguage, TranslationCandidate } from '../types/localization.js';
import type { TranslationRow } from '../types/translation.js';

interface UpsertTranslationInput {
  ocrRegionId: string;
  languageCode: TargetLanguage;
  generationCandidates: TranslationCandidate[];
  finalCandidates: TranslationCandidate[];
  recommendedStyle: RecommendedStyle;
  generationModel: string;
  promptVersion: string;
}

export async function upsertTranslation(input: UpsertTranslationInput): Promise<void> {
  const commonPayload = {
    ocr_region_id: input.ocrRegionId,
    language_code: input.languageCode,
    final_candidates: input.finalCandidates,
    recommended_style: input.recommendedStyle,
    generation_model: input.generationModel,
    prompt_version: input.promptVersion,
  };
  const result = await supabase.from('translations').upsert(
    { ...commonPayload, generation_candidates: input.generationCandidates },
    { onConflict: 'ocr_region_id,language_code' },
  );

  // 009 migration이 아직 적용되지 않은 기존 Supabase에도 업로드 흐름이 멈추지 않게 한다.
  if (result.error?.message.includes('generation_candidates')) {
    const legacyResult = await supabase.from('translations').upsert(
      { ...commonPayload, glm_candidates: input.generationCandidates },
      { onConflict: 'ocr_region_id,language_code' },
    );
    unwrapVoid(legacyResult, '번역 결과 저장에 실패했습니다.');
    return;
  }
  unwrapVoid(result, '번역 결과 저장에 실패했습니다.');
}

export async function findTranslationsByOcrRegionId(ocrRegionId: string): Promise<TranslationRow[]> {
  const result = await supabase.from('translations').select().eq('ocr_region_id', ocrRegionId);
  return unwrapList<TranslationRow>(result, '번역 결과 조회에 실패했습니다.');
}

export async function findTranslation(ocrRegionId: string, languageCode: TargetLanguage): Promise<TranslationRow | null> {
  const result = await supabase.from('translations').select().eq('ocr_region_id', ocrRegionId).eq('language_code', languageCode).maybeSingle();
  return unwrapNullableRow<TranslationRow>(result, '번역 결과 조회에 실패했습니다.');
}

export async function incrementRegenerateCount(ocrRegionId: string, languageCode: TargetLanguage, nextCount: number): Promise<void> {
  const result = await supabase
    .from('translations')
    .update({ regenerate_count: nextCount })
    .eq('ocr_region_id', ocrRegionId)
    .eq('language_code', languageCode);

  unwrapVoid(result, '재생성 횟수 갱신에 실패했습니다.');
}

export async function deleteTranslationsByOcrRegionId(ocrRegionId: string): Promise<void> {
  const result = await supabase.from('translations').delete().eq('ocr_region_id', ocrRegionId);
  unwrapVoid(result, '기존 번역 결과를 초기화하지 못했습니다.');
}
