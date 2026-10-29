import type { TargetLanguage } from '../types/project.js';
import { classifyConfidence } from '../types/ocr.js';
import type { QaFinding, QaFindingCode } from '../types/qa.js';
import type { QaAssetInput } from './inputs.js';

// 파이프라인이 실패시킨 에셋의 error_code를 가장 가까운 QA 항목으로 옮긴다.
function codeForFailedAsset(errorCode: string | null): QaFindingCode {
  if (errorCode?.startsWith('OCR_')) return 'OCR_NO_TEXT';
  if (errorCode?.startsWith('TRANSLATION_')) return 'TRANSLATION_MISSING';
  if (errorCode === 'IMAGE_CLEANUP_FAILED') return 'CLEANUP_MANUAL_REQUIRED';
  return 'IMAGE_LOAD_FAILED';
}

/**
 * DB에 남은 파이프라인 결과(OCR·번역·정리)를 읽어 판정한다. 모든 finding은 결정적 규칙이라 source='rule'이다.
 * cleanupResolved: 에디터에서 수동 정리를 이미 적용했는지.
 */
export function inspectPipeline(input: QaAssetInput, targetLanguages: TargetLanguage[], cleanupResolved: boolean): QaFinding[] {
  const { asset, regions, translations } = input;
  const imageId = asset.id;

  if (asset.status === 'failed') {
    return [{
      code: codeForFailedAsset(asset.error_code), severity: 'fail', source: 'rule', imageId,
      message: asset.error_message ?? '처리 중 이 이미지가 실패했습니다.',
      ...(asset.error_code ? { measuredValue: asset.error_code } : {}),
      recommendation: '이 이미지만 다시 처리하거나 다른 이미지로 교체해 주세요.',
    }];
  }

  const findings: QaFinding[] = [];
  const koreanRegions = regions.filter((region) => region.contains_korean);

  if (koreanRegions.length === 0) {
    findings.push({
      code: 'OCR_NO_TEXT', severity: 'review', source: 'rule', imageId,
      message: '한글 글자가 검출되지 않았습니다. 글자가 없는 이미지라면 그대로 두어도 됩니다.',
      recommendation: '글자가 있어야 하는 이미지라면 에디터에서 영역을 직접 지정해 주세요.',
    });
  }

  for (const region of koreanRegions) {
    const tier = classifyConfidence(region.confidence);
    const severity = tier === 'likely-failed' ? 'fail' : tier === 'needs-review' || region.needs_manual_review ? 'review' : 'pass';
    findings.push({
      code: 'OCR_LOW_CONFIDENCE', severity, source: 'rule', imageId, region: region.bbox,
      message: severity === 'pass' ? '글자 인식 신뢰도가 충분합니다.' : '글자 인식 신뢰도가 낮아 원문이 맞는지 확인이 필요합니다.',
      measuredValue: region.confidence, criterion: '신뢰도 ≥ 0.75',
      ...(severity === 'pass' ? {} : { recommendation: '에디터에서 인식된 원문을 확인하고 필요하면 고쳐 주세요.' }),
    });
  }

  for (const region of koreanRegions) {
    for (const languageCode of targetLanguages) {
      const found = translations
        .filter((row) => row.ocr_region_id === region.id && row.language_code === languageCode)
        .some((row) => Array.isArray(row.final_candidates) && row.final_candidates.some((candidate) => candidate.text?.trim().length > 0));
      findings.push({
        code: 'TRANSLATION_MISSING', severity: found ? 'pass' : 'fail', source: 'rule', imageId, region: region.bbox,
        message: found ? `${languageCode} 번역이 있습니다.` : `${languageCode} 번역이 없습니다.`,
        measuredValue: languageCode,
        ...(found ? {} : { recommendation: '번역을 다시 생성하거나 에디터에서 직접 입력해 주세요.' }),
      });
    }
  }

  const cleanupFailed = asset.needs_manual_cleanup && !cleanupResolved;
  findings.push({
    code: 'CLEANUP_MANUAL_REQUIRED', severity: cleanupFailed ? 'fail' : 'pass', source: 'rule', imageId,
    message: !asset.needs_manual_cleanup
      ? '원본 글자가 자동으로 정리됐습니다.'
      : cleanupResolved ? '수동 정리가 적용됐습니다.' : '원본 글자가 남아 있을 수 있어 수동 정리가 필요합니다.',
    ...(cleanupFailed ? { recommendation: '에디터의 수동 정리 도구로 원본 글자를 지워 주세요.' } : {}),
  });

  return findings;
}
