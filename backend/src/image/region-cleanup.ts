import type { PixelBox } from '../utils/bbox.js';
import type { CleanupMethod, CleanupQuality } from '../types/cleanup.js';
import { sampleTextColorFromDecoded, type DecodedImage, type TextColor } from './background-sampler.js';
import { assessCleanupQuality } from './cleanup-quality.js';
import { decideStableCleanup } from './cleanup-decision.js';
import { applySolidColorCleanup } from './solid-color-cleanup.js';
import { applyTransparentCleanup } from './transparent-cleanup.js';
import { generateTextEraseMask } from './mask-generator.js';
import { isMaskCoverageSafe, measureMaskCoverage } from './mask-coverage.js';
import { generateAdaptiveTextMask } from './adaptive-text-mask.js';
import { applyDirectionalInpaint } from './directional-inpaint.js';

const ADAPTIVE_MASK_MIN_CONFIDENCE = 0.55;

export interface RegionCleanupInput {
  decoded: DecodedImage;
  /** 원본 이미지(마스크 판정 기준). */
  originalBuffer: Buffer;
  /** 앞선 영역들이 이미 지워진 누적 이미지(여기에 이번 영역을 지운다). */
  currentBuffer: Buffer;
  bbox: PixelBox;
  width: number;
  height: number;
  /** OCR 검수 플래그가 붙은 영역인지 — 복잡한 배경 인페인팅은 막는다. */
  ocrNeedsReview: boolean;
}

export type RegionManualReason = 'review-complex-background' | 'periodic-pattern' | 'no-safe-mask' | 'unsafe-mask-coverage';

export type RegionCleanupOutcome =
  | { kind: 'cleaned'; method: CleanupMethod; quality: CleanupQuality; buffer: Buffer; textColor: TextColor | null }
  | { kind: 'manual'; reason: RegionManualReason; textColor: TextColor | null };

/**
 * 영역 하나를 지운다. DB·프로젝트 상태를 건드리지 않는 순수 픽셀 로직이라 서비스와 벤치마크가 같은 코드를 쓴다.
 * 자동으로 안전하게 지울 수 없으면 원본을 그대로 두고 이유와 함께 manual을 돌려준다.
 */
export async function cleanRegionPixels(input: RegionCleanupInput): Promise<RegionCleanupOutcome> {
  const { decoded, originalBuffer, currentBuffer, bbox, width, height, ocrNeedsReview } = input;
  const { method, stats, periodic } = decideStableCleanup(decoded, bbox);
  const quality = assessCleanupQuality(method, stats);

  if (ocrNeedsReview && method === 'directional-inpaint') {
    // 복잡한 배경 + 확정되지 않은 OCR은 반복 장식 문구·캐릭터를 일부만 지우는 비가역적 결과를 낳을 수
    // 있어 원본을 보존하고 에디터 검수로 넘긴다.
    return { kind: 'manual', reason: 'review-complex-background', textColor: null };
  }

  // 주기적으로 반복되는 무늬(줄무늬·물방울)는 복잡한 배경 인페인팅도, 단색 채우기도 무늬를 뭉개 캐릭터/배경을
  // 훼손한다(2026-09-21 벤치마크: 줄무늬 배경에서 단색 채우기가 3,000px 이상 훼손). 단색 채우기는 글자가 지워져
  // OCR 재검증으로도 못 잡는 실패라, 사전에 막고 수동/AI 폴백으로 넘긴다.
  if (periodic) {
    // cv2 Telea 인페인팅은 주변 텍스처를 매끈하게 이어붙이는 방식이라, 물방울무늬·체크무늬처럼 반복되는
    // 배경에서는 무늬를 재현하지 못하고 얼룩을 남긴다(실측 확인, 2026-09-17). 색 분산으로는 이 얼룩을
    // 구분할 수 없어서, 인페인트 시도 자체를 사전에 건너뛰고 원본을 보존한다.
    return { kind: 'manual', reason: 'periodic-pattern', textColor: sampleTextColorFromDecoded(decoded, bbox, stats.medianColor) };
  }

  if (method === 'directional-inpaint') {
    const adaptive = await generateAdaptiveTextMask(decoded, bbox);
    const adaptiveSafe = adaptive.confidence >= ADAPTIVE_MASK_MIN_CONFIDENCE
      && isMaskCoverageSafe(measureMaskCoverage(adaptive.mask));
    // 로컬 명암 기반 마스크가 두꺼운 글자·작은 이미지에서 실패하면 배경 대표색과 다른 연결성분 마스크를
    // 보조 후보로 검사한다. 둘 다 안전하지 않으면 원본 보존.
    const colorMask = adaptiveSafe ? null : await generateTextEraseMask(
      originalBuffer, bbox, width, height, { mode: 'solid', backgroundColor: stats.medianColor }, decoded,
    );
    const selectedMask = adaptiveSafe
      ? adaptive.mask
      : colorMask && isMaskCoverageSafe(measureMaskCoverage(colorMask)) ? colorMask : null;
    const textColor = sampleTextColorFromDecoded(decoded, bbox, stats.medianColor, selectedMask ?? adaptive.mask);
    if (!selectedMask) return { kind: 'manual', reason: 'no-safe-mask', textColor };
    const buffer = await applyDirectionalInpaint(currentBuffer, bbox, width, height, selectedMask);
    return { kind: 'cleaned', method, quality, buffer, textColor };
  }

  const mask = await generateTextEraseMask(
    originalBuffer, bbox, width, height,
    method === 'transparent-mask' ? { mode: 'transparent' } : { mode: 'solid', backgroundColor: stats.medianColor },
    decoded,
  );
  const textColor = sampleTextColorFromDecoded(decoded, bbox, stats.medianColor, mask);
  // solid-color-fill/transparent-mask는 decideCleanupMethod가 이미 배경이 단색/투명임을 확인한 뒤에만
  // 선택하므로, 지우는 비율이 높아도(안티에일리어싱까지 지우는 정상 범위) 안전하다고 본다.
  if (!isMaskCoverageSafe(measureMaskCoverage(mask), true)) {
    // 마스크가 비정상이면 단색 배경이어도 OCR 사각형 전체를 덮지 않는다. 잘못 잡힌 박스가 캐릭터/말풍선
    // 윤곽을 영구적으로 지우는 것보다 원본 보존 + 수동 검수가 안전하다.
    return { kind: 'manual', reason: 'unsafe-mask-coverage', textColor };
  }
  const buffer = method === 'transparent-mask'
    ? await applyTransparentCleanup(currentBuffer, bbox, width, height, mask)
    : await applySolidColorCleanup(currentBuffer, bbox, stats.medianColor, width, height, mask);
  return { kind: 'cleaned', method, quality, buffer, textColor };
}
