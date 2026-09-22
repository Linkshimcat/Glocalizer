import sharp from 'sharp';
import type { PixelBox } from '../utils/bbox.js';
import type { DecodedImage } from './background-sampler.js';
import { padAndClampBox } from '../utils/bbox.js';
import type { BackgroundModel } from './background-model.js';

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
  /**
   * 강한 그라데이션·노이즈 배경에서 위치별 배경 추정값과 노이즈 크기를 준다. 없으면 backgroundColor 하나와의
   * 거리로 글자를 가른다(단색 배경). 전역 대표색은 배경이 크게 변하면 배경 자체를 글자로 오인한다.
   */
  backgroundModel?: BackgroundModel | null;
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
 * OCR bbox가 둥근 글자 획의 위·아래끝을 잘라내면(실측 2026-09-21: 큰 글자에서 획이 박스 밖으로
 * 6px 삐져나옴) 그 조각이 스캔 범위 밖이라 지워지지 않고 자투리로 남는다. 스캔 범위 안에서 이미
 * 글자로 확정된 픽셀에 8-이웃으로 이어진 글자색 픽셀만 위·아래로 maxGrow px까지 따라가 추가한다.
 * 이어진 획만 따라가고 거리도 제한하므로, 떨어져 있는 캐릭터·말풍선은 건드리지 않는다. in-place.
 */
export function growTextBeyondScan(
  foreground: Uint8Array,
  width: number,
  height: number,
  scanRoi: PixelBox,
  isTextPixel: (pixelIndex: number) => boolean,
  maxGrow: number,
): void {
  const left = Math.max(0, Math.floor(scanRoi.x));
  const right = Math.min(width, Math.ceil(scanRoi.x + scanRoi.width));
  const scanTop = Math.max(0, Math.floor(scanRoi.y));
  const scanBottom = Math.min(height, Math.ceil(scanRoi.y + scanRoi.height));
  const limitTop = Math.max(0, scanTop - maxGrow);
  const limitBottom = Math.min(height, scanBottom + maxGrow);
  const stack: number[] = [];
  for (const y of [scanTop, scanBottom - 1]) {
    if (y < 0 || y >= height) continue;
    for (let x = left; x < right; x += 1) if (foreground[y * width + x] === 255) stack.push(y * width + x);
  }
  while (stack.length > 0) {
    const pixel = stack.pop() as number;
    const px = pixel % width;
    const py = (pixel - px) / width;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = px + dx;
        const ny = py + dy;
        if (nx < left || nx >= right || ny < limitTop || ny >= limitBottom) continue;
        if (ny >= scanTop && ny < scanBottom) continue; // 스캔 범위 안은 이미 판정을 마쳤다.
        const index = ny * width + nx;
        if (foreground[index] === 255 || !isTextPixel(index)) continue;
        foreground[index] = 255;
        stack.push(index);
      }
    }
  }
}

/**
 * 탐지 범위 밖으로 이어지는 두꺼운 덩어리(캐릭터 몸통·큰 면)에 속한 픽셀을 표시한다.
 * 스캔 범위 안에서만 보면 박스 윗변·아랫변에 살짝 걸친 캐릭터 조각이 "얇은 글자 조각"으로 보여 글자로
 * 오인된다(2026-09-21 벤치마크: 글자 위 캐릭터가 평평하게 잘림). 글자는 획이 굵거나 글로우가 있어도 박스
 * 안에서 끝나지만, 캐릭터는 범위 경계를 넘어 계속 이어진다 — 그 차이로 구분한다.
 * thickness×thickness 정사각형이 통째로 foreground인 자리를 두꺼운 픽셀로 보고(적분영상), 두꺼운 픽셀의
 * 연결성분 중 이미지 경계가 아닌 범위 경계에 닿는 것만 덩어리로 돌려준다.
 */
export function findThickBlobs(
  isForeground: (pixelIndex: number) => boolean,
  width: number,
  height: number,
  roi: PixelBox,
  thickness: number,
): Uint8Array {
  const blob = new Uint8Array(width * height);
  const left = Math.max(0, Math.floor(roi.x));
  const top = Math.max(0, Math.floor(roi.y));
  const right = Math.min(width, Math.ceil(roi.x + roi.width));
  const bottom = Math.min(height, Math.ceil(roi.y + roi.height));
  const regionWidth = right - left;
  const regionHeight = bottom - top;
  if (regionWidth < thickness || regionHeight < thickness) return blob;
  const stride = regionWidth + 1;
  const integral = new Int32Array(stride * (regionHeight + 1));
  for (let y = 0; y < regionHeight; y += 1) {
    let rowTotal = 0;
    for (let x = 0; x < regionWidth; x += 1) {
      if (isForeground((top + y) * width + left + x)) rowTotal += 1;
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + rowTotal;
    }
  }
  const thick = new Uint8Array(regionWidth * regionHeight);
  for (let y = 0; y + thickness <= regionHeight; y += 1) {
    for (let x = 0; x + thickness <= regionWidth; x += 1) {
      const sum = integral[(y + thickness) * stride + x + thickness] - integral[y * stride + x + thickness]
        - integral[(y + thickness) * stride + x] + integral[y * stride + x];
      if (sum !== thickness * thickness) continue;
      for (let dy = 0; dy < thickness; dy += 1) for (let dx = 0; dx < thickness; dx += 1) thick[(y + dy) * regionWidth + x + dx] = 1;
    }
  }
  // 이미지 경계가 아닌 범위 경계(그 너머로 덩어리가 이어질 수 있는 쪽)를 구한다.
  const openTop = top > 0;
  const openBottom = bottom < height;
  const openLeft = left > 0;
  const openRight = right < width;
  const visited = new Uint8Array(thick.length);
  const stack: number[] = [];
  for (let start = 0; start < thick.length; start += 1) {
    if (thick[start] !== 1 || visited[start] === 1) continue;
    stack.length = 0;
    stack.push(start);
    visited[start] = 1;
    const component: number[] = [];
    let cut = false;
    while (stack.length > 0) {
      const index = stack.pop() as number;
      component.push(index);
      const x = index % regionWidth;
      const y = (index - x) / regionWidth;
      if ((openTop && y === 0) || (openBottom && y === regionHeight - 1) || (openLeft && x === 0) || (openRight && x === regionWidth - 1)) cut = true;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx; const ny = y + dy;
          if (nx < 0 || nx >= regionWidth || ny < 0 || ny >= regionHeight) continue;
          const next = ny * regionWidth + nx;
          if (thick[next] === 1 && visited[next] === 0) { visited[next] = 1; stack.push(next); }
        }
      }
    }
    if (!cut) continue;
    for (const index of component) {
      const x = index % regionWidth;
      blob[(top + (index - x) / regionWidth) * width + left + x] = 1;
    }
  }
  return blob;
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
  // 2026-09-17 실측: 2px 상한이 둥근 폰트 글자 획의 아래쪽 끝을 스캔 범위 밖에 남기는
  // 경우가 있었다. 배경색 추정 오염 문제(solid-color-cleanup.ts)를 고친 뒤에도 아주 옅은
  // 실선이 남아, 여유를 1px 더 뒀다.
  const verticalPadding = Math.max(1, Math.min(3, Math.ceil(box.height * 0.1)));
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
  const model = options.mode === 'solid' ? options.backgroundModel ?? null : null;
  // 노이즈 자체가 글자로 잡히지 않도록 임계값을 노이즈 크기의 약 3배로 올린다(가우시안 3σ).
  const textDistance = model ? Math.max(MIN_COLOR_DISTANCE, 3 * model.noiseSigma) : MIN_COLOR_DISTANCE;
  const isTextAt = (pixel: number): boolean => {
    const base = pixel * channels;
    const alpha = data[base + 3];
    if (options.mode === 'transparent') return alpha >= 24;
    if (alpha < 24) return false;
    if (model) {
      const x = pixel % imageWidth;
      const expected = model.at(x, (pixel - x) / imageWidth);
      return colorDistance(data[base], data[base + 1], data[base + 2], { r: expected[0], g: expected[1], b: expected[2] }) >= textDistance;
    }
    return background !== undefined && colorDistance(data[base], data[base + 1], data[base + 2], background) >= MIN_COLOR_DISTANCE;
  };

  for (let y = Math.floor(scanRoi.y); y < Math.ceil(scanRoi.y + scanRoi.height); y += 1) {
    for (let x = Math.floor(scanRoi.x); x < Math.ceil(scanRoi.x + scanRoi.width); x += 1) {
      const pixel = y * imageWidth + x;
      foreground[pixel] = isTextAt(pixel) ? 255 : 0;
    }
  }

  // 글자 획보다 훨씬 두꺼운 덩어리(캐릭터 몸통·면)는 글자가 아니다. 박스 윗변·아랫변에 살짝 걸친 캐릭터가
  // 스캔 범위 안에서는 얇은 조각처럼 보여 글자로 오인되는 것을 막는다. 두께 기준은 글자 높이에 비례한다
  // (굵은 글꼴의 획도 글자 높이의 35%를 넘지 않는다).
  const blobThickness = Math.max(10, Math.round(box.height * 0.35));
  // 아래에서 스캔 범위 밖으로 획을 따라 자라는 거리(maxGrow)만큼 위아래로 넓혀서 덩어리를 찾는다.
  const maxGrow = Math.max(4, Math.min(24, Math.ceil(box.height * 0.16)));
  const blobRoi = {
    x: scanRoi.x,
    y: Math.max(0, scanRoi.y - maxGrow),
    width: scanRoi.width,
    height: Math.min(imageHeight, scanRoi.y + scanRoi.height + maxGrow) - Math.max(0, scanRoi.y - maxGrow),
  };
  // 두께를 재려면 범위 안 조각뿐 아니라 그 너머까지 봐야 한다(캐릭터 조각은 범위 안에선 얇아 보인다).
  const analysisLeft = Math.max(0, blobRoi.x - blobThickness);
  const analysisTop = Math.max(0, blobRoi.y - blobThickness);
  const analysisRoi = {
    x: analysisLeft,
    y: analysisTop,
    width: Math.min(imageWidth, blobRoi.x + blobRoi.width + blobThickness) - analysisLeft,
    height: Math.min(imageHeight, blobRoi.y + blobRoi.height + blobThickness) - analysisTop,
  };
  const thickBlobs = findThickBlobs((pixel) => isTextAt(pixel), imageWidth, imageHeight, analysisRoi, blobThickness);
  const insideThickBlob = (pixel: number): boolean => thickBlobs[pixel] === 1;
  for (let y = Math.max(0, Math.floor(scanRoi.y)); y < Math.min(imageHeight, Math.ceil(scanRoi.y + scanRoi.height)); y += 1) {
    for (let x = Math.max(0, Math.floor(scanRoi.x)); x < Math.min(imageWidth, Math.ceil(scanRoi.x + scanRoi.width)); x += 1) {
      if (thickBlobs[y * imageWidth + x] === 1) foreground[y * imageWidth + x] = 0;
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

  // 스캔 범위 위·아래로 삐져나간 획의 끝까지 이어 붙인다. 박스 높이에 비례하되 상한을 둬서
  // 몸통에 붙은 글자에서도 지나치게 번지지 않게 한다(scan 범위 자체는 캐릭터 보호 때문에 좁게 유지).
  growTextBeyondScan(foreground, imageWidth, imageHeight, scanRoi, (pixel) => isTextAt(pixel) && !insideThickBlob(pixel), maxGrow);
  const growTop = Math.max(0, scanRoi.y - maxGrow);
  const growBottom = Math.min(imageHeight, scanRoi.y + scanRoi.height + maxGrow);
  const grownRoi = { x: scanRoi.x, y: growTop, width: scanRoi.width, height: growBottom - growTop };

  // 안티에일리어싱 헤일로(잔상)까지 덮도록 dilation을 조금 더 준다. 분리된 캐릭터는 위의
  // 연결성분 필터가 이미 제거했으므로 확대해도 캐릭터를 갉아먹지 않는다.
  const dilationRadius = Math.max(3, Math.min(7, Math.round(Math.min(box.width, box.height) / 24)));
  const expanded = dilateMask(foreground, imageWidth, imageHeight, dilationRadius, {
    x: grownRoi.x,
    y: Math.max(0, grownRoi.y - dilationRadius),
    width: grownRoi.width,
    height: Math.min(imageHeight, grownRoi.y + grownRoi.height + dilationRadius) - Math.max(0, grownRoi.y - dilationRadius),
  });
  const { data: blurred, info: blurInfo } = await sharp(Buffer.from(expanded), { raw: { width: imageWidth, height: imageHeight, channels: 1 } })
    .blur(1.2)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const mask = new Uint8Array(imageWidth * imageHeight);
  for (let index = 0; index < mask.length; index += 1) {
    mask[index] = 255 - blurred[index * blurInfo.channels];
  }
  return { data: mask, width: imageWidth, height: imageHeight, roi: grownRoi };
}
