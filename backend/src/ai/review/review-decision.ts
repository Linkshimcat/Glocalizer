import { env } from '../../config/env.js';
import type { TranslationValidationResult } from '../../types/localization.js';

export interface ReviewDecisionInput {
  ocrConfidence: number;
  validation: TranslationValidationResult;
  highQualityMode: boolean;
}

/**
 * DeepSeek는 다음 중 하나라도 해당하면 호출한다:
 * OCR confidence가 낮음 / 로컬 검증에서 needsReview가 뜸 / 사용자가 고품질 검수를 선택함.
 */
export function needsDeepSeekReview(input: ReviewDecisionInput): boolean {
  return input.ocrConfidence < env.OCR_REVIEW_THRESHOLD || input.validation.needsReview || input.highQualityMode;
}
