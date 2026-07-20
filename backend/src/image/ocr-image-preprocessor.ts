import sharp from 'sharp';
import { AppError } from '../errors/app-error.js';

/**
 * Nemotron OCR v2는 인라인 data URL의 base64 길이가 180,000자 미만이어야 한다(NVIDIA 예제 코드로 확인).
 * NVCF Assets API로 큰 원본을 그대로 참조하는 방식도 시도해봤지만 이 엔드포인트(/v1/cv/nvidia/nemotron-ocr-v2)는
 * "data:<type>;base64,<data>" 형식만 허용하고 asset 참조 URL은 422로 거부한다(2026-07-21 실측).
 * 그래서 원본 대신, 기획서 5.2/5.3에서 이미 언급된 "OCR 처리용 축소 이미지"를 만들어 보낸다 —
 * bbox는 0~1 정규화 좌표로 돌아오므로, 원본 크기로 되돌리는 계산(ocr.service.ts)에는 영향이 없다.
 */
const MAX_INLINE_BASE64_LENGTH = 175_000; // NVIDIA 한도(180,000)보다 여유를 둔 값
const PNG_MAX_DIMENSIONS = [1600, 1200, 900, 700, 500, 350];
const JPEG_ATTEMPTS: Array<{ maxDimension: number; quality: number }> = [
  { maxDimension: 1200, quality: 80 },
  { maxDimension: 900, quality: 70 },
  { maxDimension: 700, quality: 60 },
  { maxDimension: 500, quality: 50 },
  { maxDimension: 350, quality: 40 },
];

export interface OcrReadyImage {
  dataUrl: string;
  mimeType: 'image/png' | 'image/jpeg';
  width: number;
  height: number;
}

function toDataUrl(buffer: Buffer, mimeType: 'image/png' | 'image/jpeg'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/** 이모티콘은 대부분 투명/단색 배경이라 PNG로도 충분히 작다. 먼저 PNG로 줄여보고, 그래도 크면 흰 배경 JPEG로 전환한다. */
export async function prepareImageForOcr(buffer: Buffer): Promise<OcrReadyImage> {
  for (const maxDimension of PNG_MAX_DIMENSIONS) {
    const resized = sharp(buffer).resize({
      width: maxDimension,
      height: maxDimension,
      fit: 'inside',
      withoutEnlargement: true,
    });
    const outBuffer = await resized.png({ compressionLevel: 9 }).toBuffer();
    const dataUrl = toDataUrl(outBuffer, 'image/png');
    if (dataUrl.length < MAX_INLINE_BASE64_LENGTH) {
      const metadata = await sharp(outBuffer).metadata();
      return { dataUrl, mimeType: 'image/png', width: metadata.width!, height: metadata.height! };
    }
  }

  for (const { maxDimension, quality } of JPEG_ATTEMPTS) {
    const outBuffer = await sharp(buffer)
      .resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality })
      .toBuffer();
    const dataUrl = toDataUrl(outBuffer, 'image/jpeg');
    if (dataUrl.length < MAX_INLINE_BASE64_LENGTH) {
      const metadata = await sharp(outBuffer).metadata();
      return { dataUrl, mimeType: 'image/jpeg', width: metadata.width!, height: metadata.height! };
    }
  }

  throw new AppError(
    'NEMOTRON_OCR_FAILED',
    undefined,
    '이미지를 OCR 인라인 업로드 제한(base64 175,000자) 이하로 줄이지 못했습니다.',
  );
}
