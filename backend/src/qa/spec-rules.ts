import sharp from 'sharp';
import type { QaFinding } from '../types/qa.js';
import { MARGIN_MIN_RATIO, OGQ_DIMENSIONS, OGQ_MAX_FILE_BYTES, OPAQUE_ALPHA_THRESHOLD, TRANSPARENT_ALPHA_THRESHOLD } from './constants.js';

/** 내보낸 PNG를 읽지 못해 생긴 IMAGE_LOAD_FAILED를 파이프라인 실패와 구분하는 표시. 재검사 때 규격 판정을 이어받을지 정하는 데 쓴다. */
export const SPEC_LOAD_FAILED_CRITERION = '내보낸 PNG 판독';

interface PixelAnalysis {
  hasTransparency: boolean;
  /** 캐릭터 가장자리와 이미지 가장자리 사이의 최소 거리(px). 캐릭터 영역을 가를 수 없으면 null. */
  marginPx: number | null;
  marginRatio: number | null;
}

// 프런트 lib/ogqSpecCheck.ts의 analyzePixels와 같은 기준으로 픽셀을 훑는다.
function analyzePixels(data: Buffer, width: number, height: number): PixelAnalysis {
  let hasTransparency = false;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3]!;
      if (alpha < OPAQUE_ALPHA_THRESHOLD) hasTransparency = true;
      if (alpha > TRANSPARENT_ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!hasTransparency || maxX < 0) return { hasTransparency, marginPx: null, marginRatio: null };
  const marginPx = Math.min(minX, minY, width - 1 - maxX, height - 1 - maxY);
  return { hasTransparency, marginPx, marginRatio: marginPx / Math.min(width, height) };
}

/**
 * 파일 이름이나 클라이언트가 보낸 MIME이 아니라 바이트를 직접 읽어 OGQ 규격 5항목을 판정한다.
 * 읽을 수 없는 파일이면 항목을 추측하지 않고 IMAGE_LOAD_FAILED 하나만 돌려준다.
 */
export async function inspectSpec(imageId: string, buffer: Buffer): Promise<QaFinding[]> {
  let format: string | undefined;
  let width: number;
  let height: number;
  let pixels: PixelAnalysis;
  try {
    format = (await sharp(buffer).metadata()).format;
    const raw = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    width = raw.info.width;
    height = raw.info.height;
    pixels = analyzePixels(raw.data, width, height);
  } catch {
    return [{ code: 'IMAGE_LOAD_FAILED', severity: 'fail', source: 'rule', imageId, message: '이미지를 읽을 수 없어 규격을 검사하지 못했습니다.', criterion: SPEC_LOAD_FAILED_CRITERION, recommendation: '유효한 PNG 파일로 다시 내보내 주세요.' }];
  }

  const dimensionsOk = OGQ_DIMENSIONS.some((size) => size.width === width && size.height === height);
  const marginOk = pixels.marginRatio !== null && pixels.marginRatio >= MARGIN_MIN_RATIO;

  return [
    {
      code: 'SPEC_FORMAT', severity: format === 'png' ? 'pass' : 'fail', source: 'rule', imageId,
      message: format === 'png' ? '파일 형식이 PNG입니다.' : `파일 형식이 PNG가 아닙니다 (${format ?? '알 수 없음'}).`,
      measuredValue: format ?? 'unknown', criterion: 'PNG',
      ...(format === 'png' ? {} : { recommendation: '투명 배경을 지원하는 PNG로 내보내 주세요.' }),
    },
    {
      code: 'SPEC_FILE_SIZE', severity: buffer.length <= OGQ_MAX_FILE_BYTES ? 'pass' : 'fail', source: 'rule', imageId,
      message: buffer.length <= OGQ_MAX_FILE_BYTES ? '파일 크기가 1 MB 이하입니다.' : '파일 크기가 1 MB를 넘습니다.',
      measuredValue: buffer.length, criterion: '≤ 1 MB',
      ...(buffer.length <= OGQ_MAX_FILE_BYTES ? {} : { recommendation: '색 수를 줄이거나 불필요한 효과를 줄여 용량을 낮춰 주세요.' }),
    },
    {
      code: 'SPEC_DIMENSIONS', severity: dimensionsOk ? 'pass' : 'fail', source: 'rule', imageId,
      message: dimensionsOk ? 'OGQ 규격 크기와 일치합니다.' : 'OGQ 규격 크기(240×240, 740×640, 96×74)와 다릅니다.',
      measuredValue: `${width}×${height}`, criterion: '240×240 / 740×640 / 96×74',
      ...(dimensionsOk ? {} : { recommendation: '내보내기에서 OGQ 규격 프리셋을 선택해 주세요.' }),
    },
    {
      code: 'SPEC_TRANSPARENCY', severity: pixels.hasTransparency ? 'pass' : 'fail', source: 'rule', imageId,
      message: pixels.hasTransparency ? '투명 배경이 있습니다.' : '투명 배경이 없습니다 (모든 픽셀이 불투명).',
      measuredValue: pixels.hasTransparency ? '투명 픽셀 있음' : '투명 픽셀 없음', criterion: '투명 배경',
      ...(pixels.hasTransparency ? {} : { recommendation: '배경을 투명하게 만들어 다시 내보내 주세요.' }),
    },
    {
      code: 'SPEC_MARGIN', severity: marginOk ? 'pass' : 'review', source: 'rule', imageId,
      message: pixels.marginRatio === null
        ? '캐릭터 영역을 가를 수 없어 여백을 측정하지 못했습니다 (배경이 불투명하거나 보이는 픽셀이 없음).'
        : marginOk ? '캐릭터 주변 여백이 충분합니다.' : '캐릭터가 이미지 가장자리에 너무 가깝습니다.',
      ...(pixels.marginPx === null ? {} : { measuredValue: pixels.marginPx }),
      criterion: '짧은 변의 4% 이상',
      ...(marginOk ? {} : { recommendation: '캐릭터를 안쪽으로 옮기거나 크기를 줄여 여백을 확보해 주세요.' }),
    },
  ];
}
