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
 * OCR bbox 전체(패딩 포함)를 지울 영역으로 넘긴다. mask-generator.ts의 정밀 글자 마스크
 * (색상 거리 기반)도 실측해봤지만, 배경이 단색이 아니라 그라데이션·패턴처럼 여러 색이
 * 섞여 있으면 "이 픽셀이 글자인지 배경인지" 판별 자체가 무너져서 글자가 절반 넘게 그대로
 * 남는 더 나쁜 결과가 나왔다. 사각형 전체를 지우면 반복 패턴 위에서 얼룩이 남을 수 있지만,
 * 원본 한글이 그대로 남는 것보단 "정리는 됐는데 살짝 뭉개짐"이 항상 더 안전한 실패 방식이다.
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
  const left = Math.max(0, Math.floor(mask.roi.x));
  const top = Math.max(0, Math.floor(mask.roi.y));
  const right = Math.min(imageWidth, Math.ceil(mask.roi.x + mask.roi.width));
  const bottom = Math.min(imageHeight, Math.ceil(mask.roi.y + mask.roi.height));
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      maskBuffer[y * imageWidth + x] = 255;
    }
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
