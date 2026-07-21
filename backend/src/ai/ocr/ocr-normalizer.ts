import { randomUUID } from 'node:crypto';
import { normalizedToPixel, padAndClampBox, polygonToBox } from '../../utils/bbox.js';
import { containsKorean } from '../../utils/language.js';
import { classifyConfidence, type OcrRegion } from '../../types/ocr.js';
import type { RawTextDetection } from '../nvidia/nvidia.types.js';

const BOX_PADDING_PX = 4;

interface NormalizeOptions {
  imageWidth: number;
  imageHeight: number;
}

export function normalizeOcrRegions(detections: RawTextDetection[], options: NormalizeOptions): OcrRegion[] {
  const { imageWidth, imageHeight } = options;

  return detections
    .map((detection, index) => normalizeOne(detection, index, imageWidth, imageHeight))
    .filter((region): region is OcrRegion => region !== null);
}

function normalizeOne(detection: RawTextDetection, readingOrder: number, imageWidth: number, imageHeight: number): OcrRegion | null {
  const text = detection.text_prediction?.text?.trim() ?? '';
  const points = detection.bounding_box?.points ?? [];
  if (text.length === 0 || points.length === 0) return null;

  const confidence = detection.text_prediction.confidence;
  const normalizedBox = polygonToBox(points);
  const pixelBox = padAndClampBox(normalizedToPixel(normalizedBox, imageWidth, imageHeight), BOX_PADDING_PX, imageWidth, imageHeight);

  const polygon = points.map((point) => ({
    x: point.x * imageWidth,
    y: point.y * imageHeight,
  }));

  return {
    id: randomUUID(),
    text,
    confidence,
    confidenceTier: classifyConfidence(confidence),
    box: pixelBox,
    normalizedBox,
    polygon,
    containsKorean: containsKorean(text),
    readingOrder,
    isPrimary: false,
  };
}
