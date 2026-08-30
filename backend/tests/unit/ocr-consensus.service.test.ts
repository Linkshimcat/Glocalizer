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

  it('고신뢰 부분 인식보다 전체 문구를 택하고 일치 polygon 외곽을 합친다', () => {
    const full = region('안녕하세요', 0.96, 10, 10);
    const widerFull = {
      ...region('안녕하세요', 0.94, 6, 9),
      polygon: [{ x: 6, y: 9 }, { x: 96, y: 9 }, { x: 96, y: 36 }, { x: 6, y: 36 }],
    };
    const partial = {
      ...region('녕하세요', 0.999, 24, 10),
      polygon: [{ x: 24, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 34 }, { x: 24, y: 34 }],
    };

    const result = selectConsensusRegion([[full], [widerFull], [partial]]);

    expect(result?.text).toBe('안녕하세요');
    expect(Math.min(...(result?.polygon.map((point) => point.x) ?? []))).toBe(6);
    expect(Math.max(...(result?.polygon.map((point) => point.x) ?? []))).toBe(96);
  });
});
