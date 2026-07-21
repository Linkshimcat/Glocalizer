import { supabase } from '../config/supabase.js';
import { unwrapList, unwrapNullableRow, unwrapVoid } from '../utils/db-result.js';
import type { RecommendedStyle, TargetLanguage, TranslationCandidate } from '../types/localization.js';
import type { TranslationReviewResult } from '../types/review.js';
import type { TranslationRow } from '../types/translation.js';

interface UpsertTranslationInput {
  ocrRegionId: string;
  languageCode: TargetLanguage;
  glmCandidates: TranslationCandidate[];
  finalCandidates: TranslationCandidate[];
  recommendedStyle: RecommendedStyle;
  generationModel: string;
  reviewModel?: string;
  reviewResult?: TranslationReviewResult;
  promptVersion: string;
}

export async function upsertTranslation(input: UpsertTranslationInput): Promise<void> {
  const result = await supabase.from('translations').upsert(
    {
      ocr_region_id: input.ocrRegionId,
      language_code: input.languageCode,
      glm_candidates: input.glmCandidates,
      final_candidates: input.finalCandidates,
      recommended_style: input.recommendedStyle,
      generation_model: input.generationModel,
      review_model: input.reviewModel ?? null,
      review_result: input.reviewResult ?? null,
      prompt_version: input.promptVersion,
    },
    { onConflict: 'ocr_region_id,language_code' },
  );

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
