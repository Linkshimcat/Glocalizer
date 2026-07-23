import type { RecommendedStyle, TargetLanguage, TranslationCandidate } from './localization.js';

export interface TranslationRow {
  id: string;
  ocr_region_id: string;
  language_code: TargetLanguage;
  generation_candidates: TranslationCandidate[];
  final_candidates: TranslationCandidate[];
  recommended_style: RecommendedStyle | null;
  generation_model: string;
  prompt_version: string;
  regenerate_count: number;
  created_at: string;
}
