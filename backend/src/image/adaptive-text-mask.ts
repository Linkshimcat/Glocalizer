import sharp from 'sharp';
import type { PixelBox } from '../utils/bbox.js';
import { padAndClampBox } from '../utils/bbox.js';
import type { DecodedImage } from './background-sampler.js';
import { dilateMask, keepComponentsTouchingBox, type FeatherMask } from './mask-generator.js';

export interface AdaptiveTextMaskResult {
  mask: FeatherMask;
  confidence: number;
  coverage: number;
  spillRatio: number;
}

interface IntegralRegion {
  data: Float64Array;
  left: number;
  top: number;
  width: number;
  height: number;
}

function integralLuminance(image: DecodedImage, roi: PixelBox, margin: number): IntegralRegion {
  const left = Math.max(0, Math.floor(roi.x) - margin);
  const top = Math.max(0, Math.floor(roi.y) - margin);
  const right = Math.min(image.width, Math.ceil(roi.x + roi.width) + margin);
  const bottom = Math.min(image.height, Math.ceil(roi.y + roi.height) + margin);
  const width = right - left;
  const height = bottom - top;
  const stride = width + 1;
  const integral = new Float64Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y += 1) {
    let rowTotal = 0;
    for (let x = 0; x < width; x += 1) {
      const base = ((top + y) * image.width + left + x) * image.channels;
      rowTotal += image.data[base] * 0.299 + image.data[base + 1] * 0.587 + image.data[base + 2] * 0.114;
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + rowTotal;
    }
  }
  return { data: integral, left, top, width, height };
}

function localMean(integral: IntegralRegion, imageX: number, imageY: number, radius: number): number {
  const x = imageX - integral.left;
  const y = imageY - integral.top;
  const left = Math.max(0, x - radius);
  const top = Math.max(0, y - radius);
  const right = Math.min(integral.width - 1, x + radius);
  const bottom = Math.min(integral.height - 1, y + radius);
  const stride = integral.width + 1;
  const sum = integral.data[(bottom + 1) * stride + right + 1] - integral.data[top * stride + right + 1]
    - integral.data[(bottom + 1) * stride + left] + integral.data[top * stride + left];
  return sum / ((right - left + 1) * (bottom - top + 1));
}

function filterTextLikeComponents(
  foreground: Uint8Array,
  width: number,
  height: number,
  roi: PixelBox,
  box: PixelBox,
): number {
  const left = Math.max(0, Math.floor(roi.x));
  const top = Math.max(0, Math.floor(roi.y));
  const right = Math.min(width, Math.ceil(roi.x + roi.width));
  const bottom = Math.min(height, Math.ceil(roi.y + roi.height));
  const visited = new Uint8Array(foreground.length);
  const acceptedThicknesses: number[] = [];

  for (let startY = top; startY < bottom; startY += 1) {
    for (let startX = left; startX < right; startX += 1) {
      const start = startY * width + startX;
      if (foreground[start] !== 255 || visited[start] === 1) continue;
      const stack = [start];
      const component: number[] = [];
      visited[start] = 1;
      let minX = startX;
      let maxX = startX;
      let minY = startY;
      let maxY = startY;
      let insideCount = 0;

      while (stack.length > 0) {
        const pixel = stack.pop() as number;
        component.push(pixel);
        const x = pixel % width;
        const y = (pixel - x) / width;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        if (x >= box.x && x < box.x + box.width && y >= box.y && y < box.y + box.height) insideCount += 1;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) continue;
            const nextX = x + dx;
            const nextY = y + dy;
            if (nextX < left || nextX >= right || nextY < top || nextY >= bottom) continue;
            const next = nextY * width + nextX;
            if (foreground[next] === 255 && visited[next] === 0) {
              visited[next] = 1;
              stack.push(next);
            }
          }
        }
      }

      const componentWidth = maxX - minX + 1;
      const componentHeight = maxY - minY + 1;
      const insideRatio = component.length > 0 ? insideCount / component.length : 0;
      const horizontalOutline = componentWidth > box.width * 0.9 && componentHeight <= Math.max(2, box.height * 0.08);
      const verticalOutline = componentHeight > box.height * 0.9 && componentWidth <= Math.max(2, box.width * 0.04);
      const fillsBox = component.length > box.width * box.height * 0.58;
      const plausible = insideCount > 0
        && insideRatio >= 0.45
        && !horizontalOutline
        && !verticalOutline
        && !fillsBox
        && component.length >= 2;
      if (!plausible) {
        for (const pixel of component) foreground[pixel] = 0;
      } else {
        acceptedThicknesses.push(Math.min(componentWidth, componentHeight));
      }
    }
  }

  if (acceptedThicknesses.length <= 1) return acceptedThicknesses.length;
  const mean = acceptedThicknesses.reduce((sum, value) => sum + value, 0) / acceptedThicknesses.length;
  const variance = acceptedThicknesses.reduce((sum, value) => sum + (value - mean) ** 2, 0) / acceptedThicknesses.length;
  const coefficientOfVariation = mean > 0 ? Math.sqrt(variance) / mean : 1;
  return Math.max(0, 1 - Math.min(1, coefficientOfVariation));
}

/** 그라데이션·패턴에서도 로컬 밝기 대비로 글자 후보를 찾고 신뢰도를 함께 계산한다. */
export async function generateAdaptiveTextMask(image: DecodedImage, box: PixelBox): Promise<AdaptiveTextMaskResult> {
  const padding = Math.max(8, Math.min(40, Math.ceil(Math.min(box.width, box.height) * 0.25)));
  const roi = padAndClampBox(box, padding, image.width, image.height);
  const radius = Math.max(4, Math.min(18, Math.round(Math.min(box.width, box.height) * 0.18)));
  // OCR 영역마다 전체 이미지를 다시 적분하면 영역 수 × 이미지 픽셀 수만큼 비용이 든다.
  // 로컬 평균에 실제 필요한 ROI + radius만 적분해 큰 이미지의 다중 영역 처리 비용을 줄인다.
  const integral = integralLuminance(image, roi, radius);
  const foreground = new Uint8Array(image.width * image.height);
  const contrastThreshold = 16;

  for (let y = Math.floor(roi.y); y < Math.ceil(roi.y + roi.height); y += 1) {
    for (let x = Math.floor(roi.x); x < Math.ceil(roi.x + roi.width); x += 1) {
      const pixel = y * image.width + x;
      const base = pixel * image.channels;
      if (image.data[base + 3] < 24) continue;
      const luminance = image.data[base] * 0.299 + image.data[base + 1] * 0.587 + image.data[base + 2] * 0.114;
      if (Math.abs(luminance - localMean(integral, x, y, radius)) >= contrastThreshold) {
        foreground[pixel] = 255;
      }
    }
  }

  keepComponentsTouchingBox(foreground, image.width, image.height, roi, box);
  const strokeConsistency = filterTextLikeComponents(foreground, image.width, image.height, roi, box);
  const dilationRadius = Math.max(2, Math.min(6, Math.round(Math.min(box.width, box.height) / 28)));
  const expanded = dilateMask(foreground, image.width, image.height, dilationRadius, roi);
  const { data: softened, info } = await sharp(Buffer.from(expanded), { raw: { width: image.width, height: image.height, channels: 1 } })
    .blur(1)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const data = new Uint8Array(image.width * image.height);
  let erasedInside = 0;
  let erasedOutside = 0;
  let insidePixels = 0;
  for (let y = Math.floor(roi.y); y < Math.ceil(roi.y + roi.height); y += 1) {
    for (let x = Math.floor(roi.x); x < Math.ceil(roi.x + roi.width); x += 1) {
      const pixel = y * image.width + x;
      data[pixel] = 255 - softened[pixel * info.channels];
      const erased = data[pixel] < 180;
      const inside = x >= box.x && x < box.x + box.width && y >= box.y && y < box.y + box.height;
      if (inside) {
        insidePixels += 1;
        if (erased) erasedInside += 1;
      } else if (erased) {
        erasedOutside += 1;
      }
    }
  }
  for (let index = 0; index < data.length; index += 1) {
    if (data[index] === 0 && expanded[index] === 0) data[index] = 255;
  }
  const coverage = insidePixels > 0 ? erasedInside / insidePixels : 0;
  const erasedTotal = erasedInside + erasedOutside;
  const spillRatio = erasedTotal > 0 ? erasedOutside / erasedTotal : 1;
  const coverageScore = coverage >= 0.015 && coverage <= 0.58
    ? 1
    : Math.max(0, 1 - Math.min(Math.abs(coverage - 0.2) / 0.2, 1));
  const confidence = Math.max(0, Math.min(1,
    coverageScore * 0.5
      + (1 - Math.min(1, spillRatio * 3)) * 0.3
      + strokeConsistency * 0.2,
  ));
  return { mask: { data, width: image.width, height: image.height, roi }, confidence, coverage, spillRatio };
}
