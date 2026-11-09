import type { PixelBox } from '../utils/bbox.js';

export type ConfidenceTier = 'auto-approved' | 'caution' | 'needs-review' | 'likely-failed';

/** 원본 글자 이미지를 Vision 모델로 분석한 시각적 특성. 번역 텍스트 폰트를 원본과 유사하게 고르는 데 쓴다. */
export interface FontStyle {
  weight: 'thin' | 'regular' | 'bold' | 'black';
  roundness: 'sharp' | 'neutral' | 'round';
  handwritten: boolean;
  formality: 'playful' | 'neutral' | 'formal';
}

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
  source: OcrRegionSource;
  agreementScore: number;
  needsManualReview: boolean;
  fontStyle?: FontStyle | null;
}

/**
 * 'caption-suggestion': 글자 없는 이모티콘에 AI 문구 추천으로 새로 넣은 문구. 원본에 지울 글자가 없으므로
 * 이미지 정리(글자 지우기)와 원본 글자 폰트 분석을 건너뛴다 — 돌리면 캐릭터 위에 노이즈가 생긴다.
 */
export const CAPTION_REGION_SOURCE = 'caption-suggestion' as const;
export type OcrRegionSource = 'paddle-consensus' | 'vision-fallback' | typeof CAPTION_REGION_SOURCE;

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
  source: OcrRegionSource;
  agreement_score: number;
  needs_manual_review: boolean;
  font_style: FontStyle | null;
  text_color?: { r: number; g: number; b: number } | null;
  needs_manual_cleanup?: boolean;
  created_at: string;
}
