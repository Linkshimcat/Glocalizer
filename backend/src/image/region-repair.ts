import { logger } from '../config/logger.js';
import type { PixelBox } from '../utils/bbox.js';
import { removeTextWithAi, aiFallbackAvailable } from './ai-text-removal.js';
import { findResidualText } from './cleanup-verifier.js';
import type { RegionCleanupOutcome, RegionManualReason } from './region-cleanup.js';

/** 위치·글자 판독이 불확실한 영역은 AI로도 지우지 않는다(엉뚱한 곳을 다시 그릴 위험). */
const AI_ELIGIBLE_MANUAL_REASONS: RegionManualReason[] = ['periodic-pattern', 'no-safe-mask', 'unsafe-mask-coverage'];

export type VerifiedOutcome =
  | (Extract<RegionCleanupOutcome, { kind: 'cleaned' }> & { residualText: boolean })
  | Extract<RegionCleanupOutcome, { kind: 'manual' }>;

export interface RepairInput {
  outcome: RegionCleanupOutcome;
  originalBuffer: Buffer;
  /** 이 영역을 처리하기 직전의 누적 이미지(앞선 영역들이 이미 지워진 상태). */
  previousBuffer: Buffer;
  bbox: PixelBox;
  width: number;
  height: number;
}

async function tryAi(input: RepairInput, textColor: Extract<RegionCleanupOutcome, { kind: 'cleaned' }>['textColor']): Promise<VerifiedOutcome | null> {
  const { originalBuffer, previousBuffer, bbox, width, height } = input;
  // 부분 정리로 훼손되기 전의 원본 영역에서 다시 지우고, 앞선 영역들의 정리 결과 위에 박스 영역만 덮는다.
  const repaired = await removeTextWithAi(originalBuffer, previousBuffer, bbox, width, height);
  if (!repaired) return null;
  const check = await findResidualText(repaired, bbox, width, height);
  if (check.checked && check.residual) {
    logger.info({ texts: check.texts }, 'AI 폴백 결과에도 글자가 남아 수동 정리로 넘깁니다.');
    return null;
  }
  return { kind: 'cleaned', method: 'ai-inpaint', quality: 'acceptable', buffer: repaired, textColor, residualText: false };
}

/**
 * 규칙 기반 정리 결과를 OCR로 다시 읽어 글자가 남았는지 확인하고, 남았으면(또는 자동 정리가 안전하지 않아
 * 포기했으면) 이미지 편집 API로 그 영역만 다시 지운다. 폴백이 꺼져 있거나 실패하면 원래 결과를 그대로 돌려주되
 * 글자가 남았다는 사실(residualText)을 표시해 에디터가 수동 정리를 안내하게 한다.
 */
export async function verifyAndRepair(input: RepairInput): Promise<VerifiedOutcome> {
  const { outcome, bbox, width, height } = input;
  if (outcome.kind === 'manual') {
    if (!AI_ELIGIBLE_MANUAL_REASONS.includes(outcome.reason) || !aiFallbackAvailable()) return outcome;
    return (await tryAi(input, outcome.textColor)) ?? outcome;
  }

  const check = await findResidualText(outcome.buffer, bbox, width, height);
  if (!check.checked || !check.residual) return { ...outcome, residualText: false };
  logger.info({ texts: check.texts, method: outcome.method }, '정리 후에도 글자가 남아 있어 다음 방법으로 넘깁니다.');
  const repaired = await tryAi(input, outcome.textColor);
  return repaired ?? { ...outcome, quality: 'low', residualText: true };
}
