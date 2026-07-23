import { describe, expect, it } from 'vitest';
import { shouldRunFallbackVariants, shouldUseVisionFallback } from '../../src/ocr/ocr-quality.js';

function region(text: string, confidence = 0.95) {
  return { text, confidence, polygon: [{ x: 1, y: 1 }, { x: 30, y: 1 }, { x: 30, y: 20 }, { x: 1, y: 20 }] };
}

describe('OCR quality guard', () => {
  it('runs variants for incomplete short Korean recognition', () => {
    expect(shouldRunFallbackVariants([region('해용')])).toBe(true);
    expect(shouldRunFallbackVariants([region('재있게')])).toBe(true);
  });

  it('runs variants for a low-confidence split fragment', () => {
    expect(shouldRunFallbackVariants([region('하녕히주무세요'), region('뽕', 0.31)])).toBe(true);
  });

  it('keeps a long confident phrase on the fast path', () => {
    expect(shouldRunFallbackVariants([region('오늘대충이라도하자')])).toBe(false);
  });

  it('escalates short output to Vision only when it remains the selected result', () => {
    const selected = region('해용');
    expect(shouldUseVisionFallback(selected, [selected], true)).toBe(true);
    expect(shouldUseVisionFallback(region('오늘대충이라도하자'), [region('오늘대충이라도하자')], true)).toBe(false);
  });

  it('escalates a long phrase when a low-confidence split fragment remains', () => {
    expect(shouldUseVisionFallback(region('녕히주무세요'), [region('녕히주무세요'), region('떻', 0.31)], false)).toBe(true);
  });
});
