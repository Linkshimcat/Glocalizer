import { describe, expect, it } from 'vitest';
import { selectConsensusRegion } from '../../src/ocr/ocr-consensus.service.js';

const region = (text: string, confidence: number, x = 10, y = 10) => ({ text, confidence, polygon: [{ x, y }, { x: x + 80, y }, { x: x + 80, y: y + 24 }, { x, y: y + 24 }] });

describe('selectConsensusRegion', () => {
  it('selects a two-variant Korean consensus as automatic', () => {
    const result = selectConsensusRegion([[region('킹받았죠?', 0.96)], [region('킹받았죠?', 0.93)], [region('킹받았죠?', 0.91)]]);
    expect(result?.text).toBe('킹받았죠?');
    expect(result?.needsManualReview).toBe(false);
    expect(result?.agreementScore).toBeGreaterThanOrEqual(0.82);
  });

  it('marks a single weak variant for manual review', () => {
    const result = selectConsensusRegion([[region('아자', 0.5)], [], []]);
    expect(result?.needsManualReview).toBe(true);
  });
});
