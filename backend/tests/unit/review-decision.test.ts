import { describe, expect, it } from 'vitest';
import { env } from '../../src/config/env.js';
import { needsDeepSeekReview } from '../../src/ai/review/review-decision.js';

const validValidation = { valid: true, needsReview: false, reasons: [] };

describe('needsDeepSeekReview', () => {
  it('OCR confidence가 임계값보다 낮으면 검수를 호출한다', () => {
    const result = needsDeepSeekReview({
      ocrConfidence: env.OCR_REVIEW_THRESHOLD - 0.1,
      validation: validValidation,
      highQualityMode: false,
    });
    expect(result).toBe(true);
  });

  it('로컬 검증에서 needsReview가 뜨면 검수를 호출한다', () => {
    const result = needsDeepSeekReview({
      ocrConfidence: 0.99,
      validation: { valid: true, needsReview: true, reasons: ['x'] },
      highQualityMode: false,
    });
    expect(result).toBe(true);
  });

  it('사용자가 고품질 검수를 선택하면 무조건 호출한다', () => {
    const result = needsDeepSeekReview({
      ocrConfidence: 0.99,
      validation: validValidation,
      highQualityMode: true,
    });
    expect(result).toBe(true);
  });

  it('confidence가 충분히 높고, 검증도 통과하고, 고품질 모드도 아니면 호출하지 않는다', () => {
    const result = needsDeepSeekReview({
      ocrConfidence: Math.min(env.OCR_REVIEW_THRESHOLD + 0.1, 1),
      validation: validValidation,
      highQualityMode: false,
    });
    expect(result).toBe(false);
  });
});
