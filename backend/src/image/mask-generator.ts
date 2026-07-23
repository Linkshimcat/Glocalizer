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

/** ROI 경계에 붙은 성분은 말풍선 테두리·캐릭터선일 가능성이 높아 보존한다. */
function splitBoundaryComponents(input: Uint8Array, width: number, height: number, roi: PixelBox): { text: Uint8Array; boundary: Uint8Array } {
  const text = new Uint8Array(input.length);
  const boundary = new Uint8Array(input.length);
  const visited = new Uint8Array(input.length);
  const left = Math.max(0, Math.floor(roi.x)); const top = Math.max(0, Math.floor(roi.y));
  const right = Math.min(width - 1, Math.ceil(roi.x + roi.width) - 1); const bottom = Math.min(height - 1, Math.ceil(roi.y + roi.height) - 1);
  for (let y = top; y <= bottom; y += 1) for (let x = left; x <= right; x += 1) {
    const start = y * width + x;
    if (input[start] === 0 || visited[start]) continue;
    const queue = [start]; const component: number[] = []; let touchesBoundary = false;
    visited[start] = 1;
    while (queue.length) {
      const current = queue.pop();
      if (current === undefined) continue;
      component.push(current);
      const currentX = current % width; const currentY = Math.floor(current / width);
      if (currentX === left || currentX === right || currentY === top || currentY === bottom) touchesBoundary = true;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        const nextX = currentX + offsetX; const nextY = currentY + offsetY;
        if (nextX < left || nextX > right || nextY < top || nextY > bottom) continue;
        const next = nextY * width + nextX;
        if (input[next] > 0 && !visited[next]) { visited[next] = 1; queue.push(next); }
      }
    }
    for (const pixel of component) (touchesBoundary ? boundary : text)[pixel] = 255;
  }
  return { text, boundary };
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
  // padding을 과도하게 넓히면 말풍선 테두리가 ROI 내부로 들어와 글자로 오인될 수 있다.
  const padding = Math.max(2, Math.min(8, Math.ceil(Math.min(box.width, box.height) * 0.12)));
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

  const components = options.mode === 'solid' ? splitBoundaryComponents(foreground, imageWidth, imageHeight, roi) : null;
  const textOnly = components?.text ?? foreground;
  const dilationRadius = Math.max(1, Math.min(3, Math.round(Math.min(box.width, box.height) / 48)));
  const expanded = dilate(textOnly, imageWidth, imageHeight, dilationRadius, roi);
  if (components) for (let index = 0; index < expanded.length; index += 1) if (components.boundary[index] > 0) expanded[index] = 0;
  const { data: blurred, info: blurInfo } = await sharp(Buffer.from(expanded), { raw: { width: imageWidth, height: imageHeight, channels: 1 } })
    .blur(1.2)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const mask = new Uint8Array(imageWidth * imageHeight);
  for (let index = 0; index < mask.length; index += 1) {
    mask[index] = components?.boundary[index] ? 255 : 255 - blurred[index * blurInfo.channels];
  }
  return { data: mask, width: imageWidth, height: imageHeight, roi };
}
