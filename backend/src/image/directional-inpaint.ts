import sharp from 'sharp';
import type { PixelBox } from '../utils/bbox.js';
import type { FeatherMask } from './mask-generator.js';
import { runCvInpaint } from './cv-inpaint-bridge.js';

/**
 * OpenCV(Telea) inpainting으로 글자 영역을 주변 텍스처를 참고해 자연스럽게 메운다.
 * 예전엔 좌우/상하 픽셀을 선형보간하는 자체 구현을 썼는데, 패턴·그라데이션 경계가 있는
 * 배경에서 티가 많이 나서 manual-required로 자주 떨어지는 원인이었다. cv2.inpaint는
 * PaddleOCR 설치의 부수 의존성으로 이미 들어와 있는 검증된 알고리즘이라 교체했다.
 *
 * FeatherMask에서 실제 글자로 판정된 픽셀만 OpenCV 마스크로 뒤집어 전달한다.
 * 마스크 신뢰도가 낮은 영역의 사각형 블러 fallback 판단은 cleanup.service가 담당한다.
 */
export async function applyDirectionalInpaint(
  buffer: Buffer,
  box: PixelBox,
  imageWidth: number,
  imageHeight: number,
  mask: FeatherMask,
): Promise<Buffer> {
  const image = await sharp(buffer).ensureAlpha().png().toBuffer();

  const maskBuffer = Buffer.alloc(imageWidth * imageHeight, 0);
  for (let index = 0; index < maskBuffer.length; index += 1) {
    // FeatherMask는 0=지움, 255=유지이고 OpenCV는 반대(255=인페인트)다.
    maskBuffer[index] = mask.data[index] < 180 ? 255 : 0;
  }
  const maskPng = await sharp(maskBuffer, { raw: { width: imageWidth, height: imageHeight, channels: 1 } }).png().toBuffer();

  const radius = Math.max(3, Math.round(Math.min(box.width, box.height) * 0.06));
  const result = await runCvInpaint({
    imageBase64: image.toString('base64'),
    maskBase64: maskPng.toString('base64'),
    radius,
    algorithm: 'telea',
  });

  return sharp(result).ensureAlpha().png().toBuffer();
}
