import { logger } from '../../config/logger.js';
import type { TranslationReviewInput, TranslationReviewResult } from '../../types/review.js';
import { deepseekReviewProvider } from './deepseek-review.provider.js';

/**
 * DeepSeek 검수 실패는 전체 파이프라인을 막지 않는다(기획서 11장). 실패하면 null을 반환하고,
 * 호출부는 GLM 결과를 그대로 최종 후보로 사용한다.
 */
export async function tryReviewTranslation(input: TranslationReviewInput): Promise<TranslationReviewResult | null> {
  try {
    return await deepseekReviewProvider.review(input);
  } catch (err) {
    logger.warn({ err }, 'DeepSeek 검수 실패 — GLM 결과로 폴백합니다.');
    return null;
  }
}
