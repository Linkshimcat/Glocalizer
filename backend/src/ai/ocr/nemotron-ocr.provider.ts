import { callNemotronOcr } from '../nvidia/nvidia-ocr.client.js';
import type { OcrInputImage, OcrProvider, OcrProviderResult } from './ocr-provider.types.js';

export const nemotronOcrProvider: OcrProvider = {
  async recognize(images: OcrInputImage[]): Promise<OcrProviderResult[]> {
    if (images.length === 0) return [];

    const response = await callNemotronOcr(images.map((image) => ({ dataUrl: image.dataUrl })));

    return images.map((image, index) => {
      const match = response.data.find((item) => item.index === index) ?? response.data[index];
      return { assetId: image.assetId, detections: match?.text_detections ?? [] };
    });
  },
};
