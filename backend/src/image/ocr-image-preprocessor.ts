import sharp from 'sharp';
import { AppError } from '../errors/app-error.js';

/**
 * Nemotron OCR v2는 인라인 data URL의 base64 길이가 180,000자 미만이어야 한다(NVIDIA 예제 코드로 확인).
 * NVCF Assets API로 큰 원본을 그대로 참조하는 방식도 시도해봤지만 이 엔드포인트(/v1/cv/nvidia/nemotron-ocr-v2)는
 * "data:<type>;base64,<data>" 형식만 허용하고 asset 참조 URL은 422로 거부한다(2026-07-21 실측).
 * 그래서 원본 대신, 기획서 5.2/5.3에서 이미 언급된 "OCR 처리용 축소 이미지"를 만들어 보낸다 —
 * bbox는 0~1 정규화 좌표로 돌아오므로, 원본 크기로 되돌리는 계산(ocr.service.ts)에는 영향이 없다.
 */
const MAX_INLINE_BASE64_LENGTH = 175_000;
// 흰 배경 이미지는 JPEG로 잘 압축되므로 해상도를 높게 유지할 수 있다. 큰 것부터 시도해 한도 밑에서 가장 큰 걸 쓴다.
const JPEG_ATTEMPTS: Array<{ maxDimension: number; quality: number }> = [
  { maxDimension: 1200, quality: 90 },
  { maxDimension: 1000, quality: 88 },
  { maxDimension: 800, quality: 85 },
  { maxDimension: 600, quality: 80 },
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

/**
 * OCR 입력용 이미지를 만든다. 실측 결과(2026-07-22) Nemotron OCR은
 *  - 투명 배경이면 텍스트를 거의 감지하지 못한다 → 흰 배경으로 flatten이 필수.
 *  - 이모티콘 원본이 작으면(예: 225px) 감지를 놓친다 → 작으면 확대한다.
 * withoutEnlargement를 끄고 흰 배경 JPEG로 내보내 감지율을 크게 끌어올린다.
 */
function forOcr(buffer: Buffer, maxDimension: number) {
  return sharp(buffer)
    .flatten({ background: '#ffffff' })
    .resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: false, kernel: 'lanczos3' })
    .sharpen({ sigma: 0.8 });
}

export async function prepareImageForOcr(buffer: Buffer): Promise<OcrReadyImage> {
  for (const { maxDimension, quality } of JPEG_ATTEMPTS) {
    const outBuffer = await forOcr(buffer, maxDimension).jpeg({ quality, mozjpeg: true }).toBuffer();
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
