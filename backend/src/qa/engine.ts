import { createHash } from 'node:crypto';
import type { TargetLanguage } from '../types/project.js';
import type { QaFinding, QaReport } from '../types/qa.js';
import { capAiSuggestionSeverity } from './findings.js';
import type { QaAssetInput } from './inputs.js';
import { inspectLayout } from './layout-rules.js';
import { inspectPipeline } from './pipeline-rules.js';
import { inspectSpec, SPEC_LOAD_FAILED_CRITERION } from './spec-rules.js';

export interface QaInspectionInput {
  targetLanguages: TargetLanguage[];
  assets: QaAssetInput[];
  /** 모델 의견 등 다른 모듈이 만든 finding. 엔진이 ai_suggestion 상한을 적용해 싣는다. */
  extraFindings?: QaFinding[];
}

export interface QaInspectionResult {
  findings: QaFinding[];
  /** 실제로 판정한 이미지. 아직 처리 중인 에셋은 들어가지 않는다. */
  inspectedImageIds: string[];
}

// 처리가 끝난(completed) 에셋과 실패한(failed) 에셋만 판정한다. 그 밖의 상태는 결과가 아직 없다.
const INSPECTABLE_STATUSES = new Set(['completed', 'failed']);

/**
 * 에셋마다 독립적으로 판정하므로 한 이미지가 실패해도 나머지는 계속 판정한다 (기존 파이프라인의 에셋별 격리 원칙).
 */
export async function runQaInspection(input: QaInspectionInput): Promise<QaInspectionResult> {
  const findings: QaFinding[] = [];
  const inspectedImageIds: string[] = [];

  for (const assetInput of input.assets) {
    const { asset, regions, editorStates, image } = assetInput;
    if (!INSPECTABLE_STATUSES.has(asset.status)) continue;
    inspectedImageIds.push(asset.id);

    // 에디터에서 수동 정리를 하나라도 적용했으면 해결로 본다. 영역별로 구분하지는 않는다.
    const cleanupResolved = editorStates.some((state) => typeof state.style.manualCleanup === 'object' && state.style.manualCleanup !== null);
    findings.push(...inspectPipeline(assetInput, input.targetLanguages, cleanupResolved));
    if (asset.status === 'failed') continue;

    // 규격은 브라우저가 내보낸 PNG를 받았을 때만 판정한다. 받지 않았으면 측정하지 않은 것으로 두고 항목을 만들지 않는다.
    if (image) findings.push(...(await inspectSpec(asset.id, image)));
    findings.push(...inspectLayout(asset.id, regions.filter((region) => region.contains_korean), editorStates));
  }

  findings.push(...(input.extraFindings ?? []));
  return { findings: findings.map(capAiSuggestionSeverity), inspectedImageIds };
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/**
 * 판정에 영향을 주는 저장 상태의 지문. 이미지 바이트는 넣지 않는다 — 상태가 같으면 값도 같아야
 * "같은 상태를 다시 검사했는지"를 알 수 있다. 에셋·영역·번역·에디터 상태의 순서와 무관하다.
 */
export function computeImageRevision(assets: QaAssetInput[], targetLanguages: TargetLanguage[]): string {
  const byKey = <T>(rows: T[], key: (row: T) => string) => [...rows].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
  const state = {
    languages: [...targetLanguages].sort(),
    assets: byKey(assets, (a) => a.asset.id).map((a) => ({
      asset: a.asset,
      regions: byKey(a.regions, (r) => r.id),
      translations: byKey(a.translations, (t) => `${t.ocr_region_id}/${t.language_code}`),
      editorStates: byKey(a.editorStates, (s) => `${s.ocr_region_id}/${s.language_code}`),
    })),
  };
  return createHash('sha256').update(stableStringify(state)).digest('hex').slice(0, 16);
}

/**
 * 에디터 재검사처럼 일부 이미지의 PNG만 다시 받은 경우, 나머지 이미지의 규격 판정은 직전 리포트에서 이어받는다.
 * PNG 판독 실패 기록도 규격 판정의 일부라 함께 가져오고, 파이프라인 실패는 이번에 DB 상태로 다시 판정하므로 가져오지 않는다.
 */
export function carryOverSpecFindings(previous: QaReport | null, assetIds: string[]): QaFinding[] {
  if (!previous) return [];
  const wanted = new Set(assetIds);
  return previous.findings.filter((finding) => wanted.has(finding.imageId)
    && (finding.code.startsWith('SPEC_') || (finding.code === 'IMAGE_LOAD_FAILED' && finding.criterion === SPEC_LOAD_FAILED_CRITERION)));
}
