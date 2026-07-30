import sharp from 'sharp';
import type { PixelBox } from '../utils/bbox.js';

/**
 * box 영역을 강하게 블러 처리해 원본 글자를 알아볼 수 없게 만든다(복잡한 배경 fallback).
 * 배경 복원이 어려운 경우 "완벽 삭제"를 포기하는 대신 글자 형태를 뭉개고, 그 위에 번역
 * 텍스트가 진하게 얹혀 가독성을 확보하는 전략. 경계는 feather로 부드럽게 블렌딩해
 * 사각형 이음새가 두드러지지 않게 한다.
 */
export async function applyBlurCleanup(
  buffer: Buffer,
  box: PixelBox,
  imageWidth: number,
  imageHeight: number,
): Promise<Buffer> {
  const minSide = Math.min(box.width, box.height);
  // 글자를 못 읽게 할 만큼 강하게, 영역 크기에 비례해서.
  const sigma = Math.max(6, Math.min(40, minSide / 8));
  const feather = Math.max(4, Math.min(24, minSide * 0.15));

  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data: blurred } = await sharp(buffer).ensureAlpha().blur(sigma).raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const out = Buffer.from(data);

  const boxRight = box.x + box.width;
  const boxBottom = box.y + box.height;
  const left = Math.max(0, Math.floor(box.x - feather));
  const top = Math.max(0, Math.floor(box.y - feather));
  const right = Math.min(imageWidth, Math.ceil(boxRight + feather));
  const bottom = Math.min(imageHeight, Math.ceil(boxBottom + feather));

  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      // box 안이면 완전 블러(weight 1), 밖이면 feather 거리만큼 선형 감쇠.
      const outsideX = Math.max(0, box.x - x, x - boxRight);
      const outsideY = Math.max(0, box.y - y, y - boxBottom);
      const outside = Math.max(outsideX, outsideY);
      const weight = outside <= 0 ? 1 : outside >= feather ? 0 : 1 - outside / feather;
      if (weight <= 0) continue;
      const base = (y * imageWidth + x) * channels;
      for (let c = 0; c < 3; c += 1) {
        out[base + c] = Math.round(out[base + c] * (1 - weight) + blurred[base + c] * weight);
      }
    }
  }

  return sharp(out, { raw: { width: imageWidth, height: imageHeight, channels } }).png().toBuffer();
}
