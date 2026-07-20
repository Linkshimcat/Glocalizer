import type { RawTextDetection } from '../nvidia/nvidia.types.js';

export interface OcrInputImage {
  assetId: string;
  dataUrl: string;
}

export interface OcrProviderResult {
  assetId: string;
  detections: RawTextDetection[];
}

export interface OcrProvider {
  recognize(images: OcrInputImage[]): Promise<OcrProviderResult[]>;
}
