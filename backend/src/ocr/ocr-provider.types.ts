export interface RecognizedRegion {
  text: string;
  confidence: number;
  polygon: Array<{ x: number; y: number }>;
}

export interface OcrProvider {
  readonly name: string;
  recognize(image: Buffer): Promise<RecognizedRegion[]>;
}
