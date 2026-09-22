import sharp from 'sharp';
import type { PixelBox } from '../utils/bbox.js';
import { generateTextEraseMask, type FeatherMask } from './mask-generator.js';
import { positionNoise, type BackgroundModel } from './background-model.js';

const MAX_REFERENCE_DISTANCE = 60;

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function pixelRgb(data: Buffer, width: number, channels: number, x: number, y: number): Rgb {
  const base = (y * width + x) * channels;
  return { r: data[base], g: data[base + 1], b: data[base + 2] };
}

function mix(left: Rgb, right: Rgb, ratio: number): Rgb {
  return {
    r: left.r + (right.r - left.r) * ratio,
    g: left.g + (right.g - left.g) * ratio,
    b: left.b + (right.b - left.b) * ratio,
  };
}

/**
 * OCR 박스 바깥의 좌우·상하 픽셀을 보간해 글자 아래의 배경색을 추정한다.
 *
 * 참조로 쓰는 테두리 좌표(box 경계 바로 바깥 1~2px)가 실측(2026-09-17)에서 문제가 됐다 —
 * OCR 박스가 살짝 타이트해서 글자 획이 이 참조 지점까지 침범하면, "배경색"이라고 뽑은 색이
 * 실은 글자 잉크 색이라 박스 안쪽에 옅은 회색 잔상이 번져 남았다. mask는 이미 그 지점이
 * 글자(지울 대상)인지 판단해뒀으므로, 참조 지점이 mask 상 글자로 표시돼 있으면 원본 픽셀을
 * 믿지 않고 대표 배경색(fallback)으로 대신한다.
 */
function surroundingBackground(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  box: PixelBox,
  x: number,
  y: number,
  fallback: Rgb,
  mask: FeatherMask,
): Rgb {
  const left = Math.max(0, Math.floor(box.x) - 2);
  const right = Math.min(width - 1, Math.ceil(box.x + box.width) + 1);
  const top = Math.max(0, Math.floor(box.y) - 2);
  const bottom = Math.min(height - 1, Math.ceil(box.y + box.height) + 1);
  if (left >= right || top >= bottom) return fallback;

  const clampedX = Math.max(left, Math.min(right, x));
  const clampedY = Math.max(top, Math.min(bottom, y));
  const sample = (sampleX: number, sampleY: number): Rgb => {
    if (mask.data[sampleY * width + sampleX] < 200) return fallback;
    const color = pixelRgb(data, width, channels, sampleX, sampleY);
    // 박스가 말풍선 테두리·캐릭터에 딱 붙어 있으면 참조점이 그 검은 선을 집어 채움색이 회색 얼룩이 된다
    // (2026-09-21 실측: 흰 말풍선 안 글자가 회색 줄무늬로 남음). 배경색 추정값과 너무 다른 참조점은
    // 배경이 아니므로 버리고, 완만한 그라데이션을 따라가는 용도로는 충분한 거리만 허용한다.
    return Math.hypot(color.r - fallback.r, color.g - fallback.g, color.b - fallback.b) <= MAX_REFERENCE_DISTANCE ? color : fallback;
  };
  const horizontal = mix(
    sample(left, clampedY),
    sample(right, clampedY),
    (clampedX - left) / (right - left),
  );
  const vertical = mix(
    sample(clampedX, top),
    sample(clampedX, bottom),
    (clampedY - top) / (bottom - top),
  );
  return mix(horizontal, vertical, 0.5);
}

/** box 영역을 fillColor로 채우되, mask 값(0=완전 채움, 255=원본 유지)으로 경계를 선형 블렌딩해 부드럽게 만든다. */
export async function applySolidColorCleanup(
  buffer: Buffer,
  box: PixelBox,
  fillColor: { r: number; g: number; b: number },
  imageWidth: number,
  imageHeight: number,
  existingMask?: FeatherMask,
  backgroundModel?: BackgroundModel | null,
): Promise<Buffer> {
  const mask = existingMask ?? await generateTextEraseMask(buffer, box, imageWidth, imageHeight, { mode: 'solid', backgroundColor: fillColor });

  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const pixelCount = imageWidth * imageHeight;
  const out = Buffer.from(data);

  for (let i = 0; i < pixelCount; i += 1) {
    const keepWeight = mask.data[i] / 255; // 1 = 원본 그대로, 0 = fillColor로 완전 대체
    if (keepWeight >= 1) continue;
    const base = i * channels;
    const x = i % imageWidth;
    const y = (i - x) / imageWidth;
    let fillChannels: number[];
    if (backgroundModel) {
      // 그라데이션은 위치별 평면 예측으로, 노이즈 배경은 같은 크기의 노이즈를 얹어 평평한 얼룩이 티 나지 않게 한다.
      const predicted = backgroundModel.at(x, y);
      // 사진 노이즈는 대개 세 채널이 함께 움직이는 밝기 노이즈라, 채널 상관만큼 공통 성분을 섞어 색 얼룩이 생기지 않게 한다.
      const { correlation } = backgroundModel;
      const shared = positionNoise(x, y, 0);
      fillChannels = predicted.map((value, c) => value + (Math.sqrt(correlation) * shared + Math.sqrt(1 - correlation) * positionNoise(x, y, c + 1)) * backgroundModel.channelSigma[c]);
    } else {
      const fill = surroundingBackground(data, imageWidth, imageHeight, channels, box, x, y, fillColor, mask);
      fillChannels = [fill.r, fill.g, fill.b];
    }
    for (let c = 0; c < 3; c += 1) {
      out[base + c] = Math.max(0, Math.min(255, Math.round(out[base + c] * keepWeight + fillChannels[c] * (1 - keepWeight))));
    }
  }

  return sharp(out, { raw: { width: imageWidth, height: imageHeight, channels } }).png().toBuffer();
}
