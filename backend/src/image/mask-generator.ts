import sharp from 'sharp';
import type { PixelBox } from '../utils/bbox.js';
import { padAndClampBox } from '../utils/bbox.js';

export interface FeatherMask {
  /** width*height 길이의 그레이스케일 값. 0 = box 안(완전히 지움), 255 = box 밖(원본 유지). */
  data: Uint8Array;
  width: number;
  height: number;
  /** 실제 글자 탐색에 사용한 영역. cleanup 안전성 검사에 쓴다. */
  roi: PixelBox;
}

export interface TextMaskOptions {
  mode: 'transparent' | 'solid';
  backgroundColor?: { r: number; g: number; b: number };
}

const MIN_COLOR_DISTANCE = 18;

function colorDistance(red: number, green: number, blue: number, background: { r: number; g: number; b: number }): number {
  return Math.hypot(red - background.r, green - background.g, blue - background.b);
}

function dilate(input: Uint8Array, width: number, height: number, radius: number, roi: PixelBox): Uint8Array {
  const output = new Uint8Array(input.length);
  const startY = Math.max(0, Math.floor(roi.y));
  const endY = Math.min(height, Math.ceil(roi.y + roi.height));
  const startX = Math.max(0, Math.floor(roi.x));
  const endX = Math.min(width, Math.ceil(roi.x + roi.width));
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      let foreground = false;
      for (let offsetY = -radius; offsetY <= radius && !foreground; offsetY += 1) {
        for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
          const sampleX = x + offsetX;
          const sampleY = y + offsetY;
          if (sampleX >= 0 && sampleX < width && sampleY >= 0 && sampleY < height && input[sampleY * width + sampleX] > 0) {
            foreground = true;
            break;
          }
        }
      }
      output[y * width + x] = foreground ? 255 : 0;
    }
  }
  return output;
}

/**
 * OCR bbox 안에서 배경과 다른 실제 글자 픽셀만 골라 erase mask를 만든다.
 * 0=지움, 255=유지라는 기존 FeatherMask 계약을 유지한다.
 */
export async function generateTextEraseMask(
  buffer: Buffer,
  box: PixelBox,
  imageWidth: number,
  imageHeight: number,
  options: TextMaskOptions,
): Promise<FeatherMask> {
  // 글자가 ROI 경계에 닿으면 splitBoundaryComponents가 말풍선 테두리로 오인해 보존해버려
  // 글자 대부분이 안 지워진다. padding을 넉넉히 줘 글자를 ROI 안쪽에 두되, 상한을 두어
  // 말풍선 테두리까지 ROI로 끌어들이지는 않는다.
  const padding = Math.max(6, Math.min(28, Math.ceil(Math.min(box.width, box.height) * 0.3)));
  const roi = padAndClampBox(box, padding, imageWidth, imageHeight);
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const foreground = new Uint8Array(imageWidth * imageHeight);
  const background = options.backgroundColor;

  for (let y = Math.floor(roi.y); y < Math.ceil(roi.y + roi.height); y += 1) {
    for (let x = Math.floor(roi.x); x < Math.ceil(roi.x + roi.width); x += 1) {
      const pixel = y * imageWidth + x;
      const base = pixel * info.channels;
      const alpha = data[base + 3];
      const isText = options.mode === 'transparent'
        ? alpha >= 24
        : alpha >= 24 && background !== undefined && colorDistance(data[base], data[base + 1], data[base + 2], background) >= MIN_COLOR_DISTANCE;
      foreground[pixel] = isText ? 255 : 0;
    }
  }

  // OCR bbox 안의 글자 픽셀 전체를 지운다. 예전에는 ROI 경계에 닿는 성분을 말풍선
  // 테두리로 간주해 보존(splitBoundaryComponents)했으나, bbox에 딱 맞는 글자와 받침이
  // 경계에 닿아 함께 보존되며 대부분의 글자가 지워지지 않는 버그가 있었다. 말풍선/캐릭터
  // 선은 애초에 bbox 밖이라 ROI에 들지 않으므로 그 분기를 제거한다.
  const dilationRadius = Math.max(1, Math.min(3, Math.round(Math.min(box.width, box.height) / 48)));
  const expanded = dilate(foreground, imageWidth, imageHeight, dilationRadius, roi);
  const { data: blurred, info: blurInfo } = await sharp(Buffer.from(expanded), { raw: { width: imageWidth, height: imageHeight, channels: 1 } })
    .blur(1.2)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const mask = new Uint8Array(imageWidth * imageHeight);
  for (let index = 0; index < mask.length; index += 1) {
    mask[index] = 255 - blurred[index * blurInfo.channels];
  }
  return { data: mask, width: imageWidth, height: imageHeight, roi };
}
