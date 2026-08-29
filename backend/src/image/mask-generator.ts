import sharp from 'sharp';
import type { PixelBox } from '../utils/bbox.js';
import type { DecodedImage } from './background-sampler.js';
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

/** 배경이 확실한 단색일 때만 쓰는 타이트한 bbox 채움 마스크. */
export function createTightBoxMask(box: PixelBox, imageWidth: number, imageHeight: number): FeatherMask {
  const data = new Uint8Array(imageWidth * imageHeight);
  data.fill(255);
  const left = Math.max(0, Math.floor(box.x));
  const top = Math.max(0, Math.floor(box.y));
  const right = Math.min(imageWidth, Math.ceil(box.x + box.width));
  const bottom = Math.min(imageHeight, Math.ceil(box.y + box.height));
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) data[y * imageWidth + x] = 0;
  }
  return { data, width: imageWidth, height: imageHeight, roi: box };
}

// PNG 안티에일리어싱/JPEG 노이즈와 완만한 그라데이션까지 글자로 오인하면 OCR 박스
// 대부분이 지워진다. 실제 글자색과 배경색을 구분할 수 있는 보수적인 최소 거리다.
const MIN_COLOR_DISTANCE = 28;

function colorDistance(red: number, green: number, blue: number, background: { r: number; g: number; b: number }): number {
  return Math.hypot(red - background.r, green - background.g, blue - background.b);
}

export function dilateMask(input: Uint8Array, width: number, height: number, radius: number, roi: PixelBox): Uint8Array {
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
 * ROI 안 foreground(255)를 8-이웃 연결성분으로 묶어, 성분의 충분한 비율이 OCR bbox
 * 내부에 있는 경우만 남긴다. 캐릭터 윤곽이 박스에 한 픽셀 닿았다는 이유만으로 전체가
 * 글자로 유지되는 것을 막으면서, bbox 밖으로 조금 삐져나간 글자 획은 보존한다. in-place.
 */
export function keepComponentsTouchingBox(
  foreground: Uint8Array,
  width: number,
  height: number,
  roi: PixelBox,
  box: PixelBox,
): void {
  const left = Math.max(0, Math.floor(roi.x));
  const top = Math.max(0, Math.floor(roi.y));
  const right = Math.min(width, Math.ceil(roi.x + roi.width));
  const bottom = Math.min(height, Math.ceil(roi.y + roi.height));
  const boxLeft = box.x;
  const boxRight = box.x + box.width;
  const boxTop = box.y;
  const boxBottom = box.y + box.height;
  const visited = new Uint8Array(width * height);
  const stack: number[] = [];
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const start = y * width + x;
      if (foreground[start] !== 255 || visited[start] === 1) continue;
      stack.length = 0;
      stack.push(start);
      visited[start] = 1;
      const component: number[] = [];
      let insideCount = 0;
      while (stack.length > 0) {
        const pixel = stack.pop() as number;
        component.push(pixel);
        const px = pixel % width;
        const py = (pixel - px) / width;
        if (px >= boxLeft && px < boxRight && py >= boxTop && py < boxBottom) insideCount += 1;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) continue;
            const nx = px + dx;
            const ny = py + dy;
            if (nx < left || nx >= right || ny < top || ny >= bottom) continue;
            const nIdx = ny * width + nx;
            if (foreground[nIdx] === 255 && visited[nIdx] === 0) {
              visited[nIdx] = 1;
              stack.push(nIdx);
            }
          }
        }
      }
      const insideRatio = component.length > 0 ? insideCount / component.length : 0;
      if (insideCount === 0 || insideRatio < 0.35) {
        for (const pixel of component) foreground[pixel] = 0;
      }
    }
  }
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
  decodedImage?: DecodedImage,
): Promise<FeatherMask> {
  // padding은 넉넉히 준다: OCR bbox가 첫/끝 글자·장식의 가장자리를 살짝 잘라내는 경우가
  // 많아, 박스 밖으로 삐져나간 글자 조각까지 ROI에 포함해야 잔여가 안 남는다. 대신 큰
  // padding이 옆 캐릭터를 함께 지우지 않도록, 아래에서 "박스 안 글자에 연결된 성분"만
  // 남기는 연결성분 필터로 분리된 캐릭터/말풍선은 보존한다.
  const padding = Math.max(8, Math.min(48, Math.ceil(Math.min(box.width, box.height) * 0.3)));
  const roi = padAndClampBox(box, padding, imageWidth, imageHeight);
  // 첫/끝 글자는 OCR 박스 좌우로 자주 삐져나오지만, 위아래의 큰 여백은 바로 붙은
  // 캐릭터 몸통·말풍선 테두리를 후보에 포함시킨다. 탐색은 좌우 위주로 확장한다.
  const verticalPadding = Math.max(1, Math.min(2, Math.ceil(box.height * 0.08)));
  const scanRoi = {
    x: roi.x,
    y: Math.max(0, box.y - verticalPadding),
    width: roi.width,
    height: Math.max(0, Math.min(imageHeight, box.y + box.height + verticalPadding) - Math.max(0, box.y - verticalPadding)),
  };
  const decoded = decodedImage ?? await (async () => {
    const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height, channels: info.channels };
  })();
  const data = decoded.data;
  const channels = decoded.channels;
  const foreground = new Uint8Array(imageWidth * imageHeight);
  const background = options.backgroundColor;

  for (let y = Math.floor(scanRoi.y); y < Math.ceil(scanRoi.y + scanRoi.height); y += 1) {
    for (let x = Math.floor(scanRoi.x); x < Math.ceil(scanRoi.x + scanRoi.width); x += 1) {
      const pixel = y * imageWidth + x;
      const base = pixel * channels;
      const alpha = data[base + 3];
      const isText = options.mode === 'transparent'
        ? alpha >= 24
        : alpha >= 24 && background !== undefined && colorDistance(data[base], data[base + 1], data[base + 2], background) >= MIN_COLOR_DISTANCE;
      foreground[pixel] = isText ? 255 : 0;
    }
  }

  // 작은 이모티콘에서 캐릭터 몸통/말풍선 면이 OCR 박스 상단에 걸치면 한 행을 거의
  // 전부 채우며 아래 글자와 연결된다. 이런 고밀도 행을 끊어 거대한 비문자 성분이 글자
  // 마스크로 확장되는 것을 막는다. 실제 글자 획은 한 행 전체의 85%를 채우지 않는다.
  const scanLeft = Math.max(0, Math.floor(scanRoi.x));
  const scanRight = Math.min(imageWidth, Math.ceil(scanRoi.x + scanRoi.width));
  const denseRowThreshold = Math.max(1, Math.floor((scanRight - scanLeft) * 0.85));
  for (let y = Math.max(0, Math.floor(scanRoi.y)); y < Math.min(imageHeight, Math.ceil(scanRoi.y + scanRoi.height)); y += 1) {
    let foregroundCount = 0;
    for (let x = scanLeft; x < scanRight; x += 1) if (foreground[y * imageWidth + x] === 255) foregroundCount += 1;
    if (foregroundCount >= denseRowThreshold) {
      for (let x = scanLeft; x < scanRight; x += 1) foreground[y * imageWidth + x] = 0;
    }
  }

  // 연결성분 필터: ROI 안 foreground를 성분으로 묶고, OCR bbox 내부에 걸치는 성분만 남긴다.
  // → 박스 안 글자에 연결된 조각(첫/끝 글자의 삐져나간 부분, 장식 등)은 지우고, 박스와
  //   떨어진 캐릭터·말풍선 선은 보존한다. 넓은 padding을 안전하게 쓸 수 있게 하는 핵심.
  keepComponentsTouchingBox(foreground, imageWidth, imageHeight, scanRoi, box);

  // 안티에일리어싱 헤일로(잔상)까지 덮도록 dilation을 조금 더 준다. 분리된 캐릭터는 위의
  // 연결성분 필터가 이미 제거했으므로 확대해도 캐릭터를 갉아먹지 않는다.
  const dilationRadius = Math.max(3, Math.min(7, Math.round(Math.min(box.width, box.height) / 24)));
  const expanded = dilateMask(foreground, imageWidth, imageHeight, dilationRadius, scanRoi);
  const { data: blurred, info: blurInfo } = await sharp(Buffer.from(expanded), { raw: { width: imageWidth, height: imageHeight, channels: 1 } })
    .blur(1.2)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const mask = new Uint8Array(imageWidth * imageHeight);
  for (let index = 0; index < mask.length; index += 1) {
    mask[index] = 255 - blurred[index * blurInfo.channels];
  }
  return { data: mask, width: imageWidth, height: imageHeight, roi: scanRoi };
}
