import { describe, expect, it } from 'vitest';
import { selectOcrVariantCount } from '../../src/ocr/ocr-variant-selection.js';

describe('selectOcrVariantCount', () => {
  it('uses one original-image pass for the serial Windows NPU bridge', () => {
    expect(selectOcrVariantCount({ name: 'openvino-npu' }, 6)).toBe(1);
  });

  it('keeps multi-variant consensus for PaddleOCR', () => {
    expect(selectOcrVariantCount({ name: 'paddle' }, 6)).toBe(6);
  });
});
