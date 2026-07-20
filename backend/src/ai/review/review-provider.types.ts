import type { TranslationReviewInput, TranslationReviewResult } from '../../types/review.js';

export interface TranslationReviewProvider {
  review(input: TranslationReviewInput): Promise<TranslationReviewResult>;
}
