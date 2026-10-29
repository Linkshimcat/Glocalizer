import { AppError } from '../errors/app-error.js';
import { findAssetsByProjectId } from '../repositories/asset.repository.js';
import { findEditorStatesByAssetIds } from '../repositories/editor-state.repository.js';
import { findRegionsByAssetIds } from '../repositories/ocr.repository.js';
import { findLatestQaReport, insertQaReport, listQaHistory } from '../repositories/qa.repository.js';
import { findTranslationsByOcrRegionIds } from '../repositories/translation.repository.js';
import type { ProjectRow } from '../types/project.js';
import type { QaReport, QaSummaryResponse } from '../types/qa.js';
import { QA_RULESET_VERSION } from './constants.js';
import { carryOverSpecFindings, computeImageRevision, runQaInspection } from './engine.js';
import { countVerdicts } from './findings.js';
import type { QaAssetInput } from './inputs.js';

export interface QaInspectResponse extends QaReport {
  /** 이미지별 최종 판정 수 */
  counts: { pass: number; review: number; fail: number };
  /** assetId를 지정했으면 그 이미지, 아니면 전체에 fail이 없는지. 에디터 재검사 버튼이 쓴다. */
  passed: boolean;
}

/**
 * 현재 저장 상태(OCR·번역·편집)와 브라우저가 내보내 보낸 최종 PNG로 프로젝트를 검사하고 리포트를 쌓는다.
 * uploads: assetId → 내보낸 PNG 바이트. 받지 않은 이미지의 규격 판정은 직전 리포트에서 이어받는다.
 */
export async function inspectProjectQa(project: ProjectRow, uploads: Map<string, Buffer>, focusAssetId?: string): Promise<QaInspectResponse> {
  const assets = await findAssetsByProjectId(project.id);
  const assetIds = new Set(assets.map((asset) => asset.id));
  const unknown = [...uploads.keys(), ...(focusAssetId ? [focusAssetId] : [])].find((id) => !assetIds.has(id));
  if (unknown) throw new AppError('INVALID_REQUEST', { assetId: unknown }, '이 프로젝트의 이미지가 아닙니다.');

  const ids = [...assetIds];
  const [regions, editorStates] = await Promise.all([findRegionsByAssetIds(ids), findEditorStatesByAssetIds(ids)]);
  const translations = await findTranslationsByOcrRegionIds(regions.map((region) => region.id));

  const inputs: QaAssetInput[] = assets.map((asset) => {
    const assetRegions = regions.filter((region) => region.asset_id === asset.id);
    const regionIds = new Set(assetRegions.map((region) => region.id));
    return {
      asset: {
        id: asset.id, status: asset.status, error_code: asset.error_code, error_message: asset.error_message,
        needs_manual_cleanup: asset.needs_manual_cleanup, cleaned_path: asset.cleaned_path, updated_at: asset.updated_at,
      },
      regions: assetRegions.map((region) => ({
        id: region.id, detected_text: region.detected_text, confidence: region.confidence, bbox: region.bbox,
        contains_korean: region.contains_korean, needs_manual_review: region.needs_manual_review, is_primary: region.is_primary,
      })),
      translations: translations.filter((row) => regionIds.has(row.ocr_region_id))
        .map((row) => ({ ocr_region_id: row.ocr_region_id, language_code: row.language_code, final_candidates: row.final_candidates })),
      editorStates: editorStates.filter((state) => state.asset_id === asset.id)
        .map((state) => ({ ocr_region_id: state.ocr_region_id, language_code: state.language_code, style: state.style })),
      image: uploads.get(asset.id) ?? null,
    };
  });

  // 방금 편집한 이미지(focusAssetId)는 예전 판정이 맞지 않을 수 있어 이어받지 않는다. PNG를 같이 보내면 새로 판정한다.
  const withoutUpload = assets
    .filter((asset) => asset.status === 'completed' && !uploads.has(asset.id) && asset.id !== focusAssetId)
    .map((asset) => asset.id);
  const previous = withoutUpload.length > 0 ? await findLatestQaReport(project.id) : null;
  const { findings, inspectedImageIds } = await runQaInspection({
    targetLanguages: project.target_languages,
    assets: inputs,
    extraFindings: carryOverSpecFindings(previous, withoutUpload),
  });

  const counts = countVerdicts(findings, inspectedImageIds);
  const imageRevision = computeImageRevision(inputs, project.target_languages);
  const saved = await insertQaReport({
    projectId: project.id, imageRevision, rulesetVersion: QA_RULESET_VERSION, findings,
    passCount: counts.pass, reviewCount: counts.review, failCount: counts.fail,
  });
  const passed = focusAssetId
    ? countVerdicts(findings, [focusAssetId]).fail === 0
    : counts.fail === 0;

  return {
    id: saved.id, projectId: project.id, imageRevision, inspectedAt: saved.inspectedAt,
    rulesetVersion: QA_RULESET_VERSION, findings, counts, passed,
  };
}

export async function getProjectQaSummary(projectId: string): Promise<QaSummaryResponse> {
  const [latest, history] = await Promise.all([findLatestQaReport(projectId), listQaHistory(projectId)]);
  return { latest, history };
}
