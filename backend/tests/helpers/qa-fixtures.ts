import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import type { QaAssetInput } from '../../src/qa/inputs.js';
import type { QaFinding, QaFindingCode } from '../../src/types/qa.js';

export const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

function block(width: number, height: number) {
  return { create: { width, height, channels: 4 as const, background: { r: 200, g: 50, b: 50, alpha: 1 } } };
}

/** 투명 배경 위에 불투명 사각형 하나를 놓은 PNG. 사각형 위치로 여백을 정확히 조절한다. */
export function stickerPng(opts: { width?: number; height?: number; left?: number; top?: number; blockWidth?: number; blockHeight?: number } = {}) {
  const width = opts.width ?? 740;
  const height = opts.height ?? 640;
  return sharp({ create: { width, height, channels: 4, background: TRANSPARENT } })
    .composite([{ input: block(opts.blockWidth ?? width - 140, opts.blockHeight ?? height - 140), left: opts.left ?? 70, top: opts.top ?? 70 }])
    .png()
    .toBuffer();
}

export function opaquePng(width = 740, height = 640) {
  return sharp({ create: { width, height, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } }).png().toBuffer();
}

export function jpegImage(width = 740, height = 640) {
  return sharp({ create: { width, height, channels: 3, background: { r: 255, g: 255, b: 255 } } }).jpeg().toBuffer();
}

/** 무작위 픽셀은 PNG 압축이 거의 안 돼 1 MB를 확실히 넘는다. */
export function noisyPng(width = 740, height = 640) {
  return sharp(randomBytes(width * height * 4), { raw: { width, height, channels: 4 } }).png().toBuffer();
}

export function makeAssetInput(id: string, overrides: Partial<QaAssetInput> = {}): QaAssetInput {
  return {
    asset: { id, status: 'completed', error_code: null, error_message: null, needs_manual_cleanup: false, cleaned_path: `projects/p/cleaned/${id}.png`, updated_at: '2026-10-29T00:00:00.000Z', ...overrides.asset },
    regions: overrides.regions ?? [{ id: `${id}-r1`, detected_text: '안녕', confidence: 0.95, bbox: { x: 10, y: 20, width: 100, height: 40 }, contains_korean: true, needs_manual_review: false, is_primary: true }],
    translations: overrides.translations ?? [{ ocr_region_id: `${id}-r1`, language_code: 'en', final_candidates: [{ text: 'Hello', tone: 'cute', meaning: '인사', best: true }] }],
    editorStates: overrides.editorStates ?? [],
    image: overrides.image === undefined ? null : overrides.image,
  };
}

export function findingFor(findings: QaFinding[], code: QaFindingCode, imageId?: string): QaFinding {
  const found = findings.filter((f) => f.code === code && (imageId === undefined || f.imageId === imageId));
  if (found.length !== 1) throw new Error(`expected exactly one ${code} finding, got ${found.length}`);
  return found[0]!;
}
