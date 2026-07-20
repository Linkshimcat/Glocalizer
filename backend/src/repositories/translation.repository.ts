import { supabase } from '../config/supabase.js';
import { AppError } from '../errors/app-error.js';
import type { RecommendedStyle, TargetLanguage, TranslationCandidate } from '../types/localization.js';
import type { TranslationReviewResult } from '../types/review.js';

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
  const { error } = await supabase.from('translations').upsert(
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

  if (error) {
    throw new AppError('INTERNAL_ERROR', { cause: error.message }, '번역 결과 저장에 실패했습니다.');
  }
}
