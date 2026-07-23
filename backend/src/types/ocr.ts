import type { PixelBox } from '../utils/bbox.js';

export type ConfidenceTier = 'auto-approved' | 'caution' | 'needs-review' | 'likely-failed';

export interface OcrRegion {
  id: string;
  text: string;
  confidence: number;
  confidenceTier: ConfidenceTier;

  box: PixelBox;
  normalizedBox: PixelBox;
  polygon: Array<{ x: number; y: number }>;

  containsKorean: boolean;
  readingOrder: number;
  isPrimary: boolean;
  source: 'paddle-consensus' | 'vision-fallback';
  agreementScore: number;
  needsManualReview: boolean;
}

export function classifyConfidence(confidence: number): ConfidenceTier {
  if (confidence >= 0.9) return 'auto-approved';
  if (confidence >= 0.75) return 'caution';
  if (confidence >= 0.5) return 'needs-review';
  return 'likely-failed';
}

/** ocr_regions 테이블 행 (DB에서 그대로 읽은 형태) */
export interface OcrRegionRow {
  id: string;
  asset_id: string;
  detected_text: string;
  confidence: number;
  bbox: PixelBox;
  normalized_bbox: PixelBox | null;
  polygon: Array<{ x: number; y: number }> | null;
  contains_korean: boolean;
  is_primary: boolean;
  reading_order: number;
  source: 'paddle-consensus' | 'vision-fallback';
  agreement_score: number;
  needs_manual_review: boolean;
  created_at: string;
}
