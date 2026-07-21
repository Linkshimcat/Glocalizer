import type { RecommendedStyle, TargetLanguage, TranslationCandidate } from './localization.js';
import type { TranslationReviewResult } from './review.js';

export interface TranslationRow {
  id: string;
  ocr_region_id: string;
  language_code: TargetLanguage;
  glm_candidates: TranslationCandidate[];
  review_result: TranslationReviewResult | null;
  final_candidates: TranslationCandidate[];
  recommended_style: RecommendedStyle | null;
  generation_model: string;
  review_model: string | null;
  prompt_version: string;
  regenerate_count: number;
  created_at: string;
}
