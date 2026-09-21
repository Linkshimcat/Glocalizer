import sharp from 'sharp';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { getOcrProvider } from '../ocr/ocr-provider.js';
import type { OcrProvider } from '../ocr/ocr-provider.types.js';
import type { PixelBox } from '../utils/bbox.js';

const HANGUL = /[가-힣]/;
const MIN_CONFIDENCE = 0.5;
const MIN_CROP_SIDE = 32;
const TRANSPARENT_CROP_RATIO = 0.05;

export interface ResidualCheck {
  /** 검증을 실제로 수행했는가. 실패하면 false(통과로 취급). */
  checked: boolean;
  /** 정리한 자리에 한글이 남아 있는가. */
  residual: boolean;
  texts: string[];
}

function paddedCrop(box: PixelBox, imageWidth: number, imageHeight: number): { left: number; top: number; width: number; height: number } {
  const pad = Math.max(6, Math.round(Math.min(box.width, box.height) * 0.15));
  const left = Math.max(0, Math.floor(box.x) - pad);
  const top = Math.max(0, Math.floor(box.y) - pad);
  const right = Math.min(imageWidth, Math.ceil(box.x + box.width) + pad);
  const bottom = Math.min(imageHeight, Math.ceil(box.y + box.height) + pad);
  return { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}

async function readCrop(provider: OcrProvider, crop: Buffer): Promise<string[]> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('cleanup verification timeout')), env.CLEANUP_VERIFICATION_TIMEOUT_MS).unref?.();
  });
  const regions = await Promise.race([provider.recognize(crop), timeout]);
  return regions.filter((region) => region.confidence >= MIN_CONFIDENCE && HANGUL.test(region.text)).map((region) => region.text);
}

/**
 * 정리한 영역을 OCR로 다시 읽어 한글이 남았는지 본다. 마스크가 글자를 일부만 잡았는데도 안전 검사를
 * 통과해 "성공"으로 기록되던 부분 정리(2026-09-21 실측: 200×50px 네온 글자에서 302px만 변경)를 잡는다.
 * 검증 호출이 실패하면 통과로 취급한다.
 */
export async function findResidualText(
  cleanedBuffer: Buffer,
  box: PixelBox,
  imageWidth: number,
  imageHeight: number,
  provider: OcrProvider = getOcrProvider(),
): Promise<ResidualCheck> {
  if (!env.ENABLE_CLEANUP_VERIFICATION) return { checked: false, residual: false, texts: [] };
  try {
    const area = paddedCrop(box, imageWidth, imageHeight);
    const cropped = sharp(cleanedBuffer).ensureAlpha().extract(area);
    const { data } = await cropped.clone().raw().toBuffer({ resolveWithObject: true });
    let transparentPixels = 0;
    for (let index = 3; index < data.length; index += 4) if (data[index] < 250) transparentPixels += 1;
    // 모서리에 투명 픽셀이 조금 있는 정도로는 배경을 두 번 읽지 않는다(OCR 호출 비용·시간이 두 배가 된다).
    const hasTransparency = transparentPixels / (data.length / 4) >= TRANSPARENT_CROP_RATIO;

    const scale = Math.min(area.width, area.height) < MIN_CROP_SIDE * 2 ? 2 : 1;
    // 투명 스티커는 흰 배경에서 안 보이는 흰 글자 잔상도 있을 수 있어 어두운 배경으로도 읽는다.
    const backgrounds = hasTransparency ? ['#ffffff', '#1a1a1a'] : ['#ffffff'];
    const reads = await Promise.all(backgrounds.map(async (background) => {
      let image = cropped.clone().flatten({ background });
      if (scale > 1) image = image.resize(area.width * scale, area.height * scale, { kernel: 'lanczos3' });
      return readCrop(provider, await image.png().toBuffer());
    }));
    const found = reads.flat();
    return { checked: true, residual: found.length > 0, texts: found };
  } catch (error) {
    logger.warn({ err: error }, '정리 결과 OCR 재검증에 실패해 통과로 처리합니다.');
    return { checked: false, residual: false, texts: [] };
  }
}
