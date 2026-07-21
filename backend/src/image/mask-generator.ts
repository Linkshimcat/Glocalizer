import sharp from 'sharp';
import type { PixelBox } from '../utils/bbox.js';

export interface FeatherMask {
  /** width*height 길이의 그레이스케일 값. 0 = box 안(완전히 지움), 255 = box 밖(원본 유지). */
  data: Uint8Array;
  width: number;
  height: number;
}

/**
 * box 영역이 검정(0), 나머지가 흰색(255)인 마스크를 만들고 가우시안 블러로 경계를 부드럽게(feather)
 * 만든다. sharp의 composite blend 모드는 채널 수가 안 맞는 이미지끼리 합성할 때 예측하기 어렵게
 * 동작해서(RGBA 마스크를 1채널 알파와 합성하면 조용히 4채널로 업컨버트되는 등), raw 픽셀 배열로
 * 직접 반환해 호출부에서 픽셀 단위로 계산하게 한다.
 */
export async function generateFeatheredEraseMask(
  box: PixelBox,
  imageWidth: number,
  imageHeight: number,
  featherPx: number,
): Promise<FeatherMask> {
  const svg = `<svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white"/>
    <rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="black"/>
  </svg>`;

  const { data, info } = await sharp(Buffer.from(svg))
    .blur(Math.max(featherPx, 0.3))
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const out = new Uint8Array(imageWidth * imageHeight);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = data[i * channels];
  }

  return { data: out, width: imageWidth, height: imageHeight };
}
