import { describe, expect, it } from 'vitest';
import { selectConsensusRegion, selectConsensusRegions } from '../../src/ocr/ocr-consensus.service.js';

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

  it('prefers a Korean candidate over a slightly higher-confidence non-Korean candidate', () => {
    const result = selectConsensusRegion([
      [region('HELLO', 0.96, 10), region('아자스!', 0.9, 140)],
      [region('HELLO', 0.96, 10), region('아자스!', 0.9, 140)],
      [region('HELLO', 0.96, 10), region('아자스!', 0.9, 140)],
    ]);
    expect(result?.text).toBe('아자스!');
  });

  it('accepts one high-confidence Korean NPU result without requiring variant consensus', () => {
    const result = selectConsensusRegion([[region('킹받았죠?', 0.98)]], { allowSingleVariantAutoApprove: true });
    expect(result?.needsManualReview).toBe(false);
    expect(result?.agreementScore).toBeGreaterThanOrEqual(0.82);
  });

  it('retains distinct Korean regions instead of returning only the primary candidate', () => {
    const regions = selectConsensusRegions([[region('첫문구', 0.96, 10), region('둘째문구', 0.94, 180)]]);
    expect(regions.map((region) => region.text)).toEqual(expect.arrayContaining(['첫문구', '둘째문구']));
  });
});
