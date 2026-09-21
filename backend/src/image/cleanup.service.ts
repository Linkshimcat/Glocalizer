import { findAssetsByProjectAndStatus, updateAsset } from '../repositories/asset.repository.js';
import { findRegionsByAssetId, updateRegionCleanupMetadata } from '../repositories/ocr.repository.js';
import { findProjectById, updateProjectStage } from '../repositories/project.repository.js';
import { findTranslationsByOcrRegionIds } from '../repositories/translation.repository.js';
import { downloadFromStorage, uploadToStorage } from '../repositories/storage.repository.js';
import type { AssetRow } from '../types/asset.js';
import type { CleanupResult } from '../types/cleanup.js';
import { AppError, describeError } from '../errors/app-error.js';
import { env } from '../config/env.js';
import { decodeImagePixels } from './background-sampler.js';
import { cleanRegionPixels } from './region-cleanup.js';
import { verifyAndRepair } from './region-repair.js';
import { OCR_AUTO_APPROVE_SCORE } from '../ocr/ocr-consensus.service.js';
import { mapWithConcurrency } from '../utils/concurrency.js';
import { logger } from '../config/logger.js';

const METHOD_PRIORITY: CleanupResult['method'][] = [
  'manual-required',
  'ai-inpaint',
  'directional-inpaint',
  'blur-mask',
  'solid-color-fill',
  'transparent-mask',
];

function aggregateMethod(methods: CleanupResult['method'][]): CleanupResult['method'] {
  return METHOD_PRIORITY.find((method) => methods.includes(method)) ?? 'manual-required';
}

export async function runCleanupForAsset(asset: AssetRow): Promise<CleanupResult & { assetId: string }> {
  if (!asset.original_path || !asset.width || !asset.height) {
    const errorMessage = '업로드 검증이 완료되지 않은 이미지입니다.';
    await updateAsset(asset.id, { status: 'failed', stage: 'cleaning', errorCode: 'UPLOAD_NOT_COMPLETED', errorMessage });
    return { assetId: asset.id, method: 'manual-required', quality: 'low', needsManualCleanup: true };
  }

  const regions = (await findRegionsByAssetId(asset.id)).filter((region) => region.contains_korean);
  if (regions.length === 0) {
    const errorMessage = '정리할 한국어 OCR 영역을 찾을 수 없습니다.';
    await updateAsset(asset.id, { status: 'failed', stage: 'cleaning', errorCode: 'OCR_TEXT_NOT_FOUND', errorMessage });
    return { assetId: asset.id, method: 'manual-required', quality: 'low', needsManualCleanup: true };
  }
  try {
    const buffer = await downloadFromStorage(asset.original_path);
    if (!buffer) {
      throw new AppError('IMAGE_CLEANUP_FAILED', undefined, '원본 이미지를 스토리지에서 찾을 수 없습니다.');
    }

    const decoded = await decodeImagePixels(buffer);
    const project = await findProjectById(asset.project_id);
    if (!project) throw new AppError('PROJECT_NOT_FOUND', { projectId: asset.project_id });
    const translations = await findTranslationsByOcrRegionIds(regions.map((region) => region.id));
    const translatedLanguagesByRegion = new Map<string, Set<string>>();
    for (const translation of translations) {
      const languages = translatedLanguagesByRegion.get(translation.ocr_region_id) ?? new Set<string>();
      languages.add(translation.language_code);
      translatedLanguagesByRegion.set(translation.ocr_region_id, languages);
    }
    let cleanedBuffer = buffer;
    const methods: CleanupResult['method'][] = [];
    const qualities: CleanupResult['quality'][] = [];
    let needsManualCleanup = false;
    let primaryTextColor: { r: number; g: number; b: number } | null = null;

    for (const region of regions) {
      const translatedLanguages = translatedLanguagesByRegion.get(region.id) ?? new Set<string>();
      const isTranslationComplete = project.target_languages.every((languageCode) => translatedLanguages.has(languageCode));
      if (!isTranslationComplete) {
        // 번역문이 준비되지 않은 영역을 먼저 지우면 미리보기에 빈 공간만 남는다.
        // OCR 검수 상태와 cleanup 안전성은 별개이므로 수동 cleanup 대상으로 표시하지 않는다.
        await updateRegionCleanupMetadata(region.id, { textColor: null, needsManualCleanup: false });
        continue;
      }
      // OCR 검수 플래그가 붙는 이유는 둘로 갈린다. (1) 합의 점수가 자동승인 기준 미만 — 위치 자체가 불확실하다.
      // (2) 점수는 기준 이상인데 Luna와 Paddle의 글자 판독만 엇갈린다 — 두 엔진의 박스는 이미 겹친다고
      // 확인된 상태고, 클린업은 글자 내용이 아니라 위치만 쓴다. (2)까지 통째로 막으면 같은 이미지가 Luna 판독
      // 흔들림 때문에 어떨 땐 되고 어떨 땐 안 됐다(시연3.jpeg, 2026-09-21 실측). 그래서 (1)은 기존처럼 원본을
      // 보존하고, (2)는 단색·투명 배경에서만 자동 정리한다.
      const ocrNeedsReview = region.needs_manual_review;
      const locationUnreliable = ocrNeedsReview && (region.agreement_score ?? 0) < OCR_AUTO_APPROVE_SCORE;
      if (locationUnreliable) {
        // OCR 문구나 좌표가 확정되지 않은 상태에서 자동 삭제하면 반복 장식 문구·캐릭터를
        // 일부만 지우는 비가역적 결과가 생긴다. 원본을 보존하고 에디터 검수로 넘긴다.
        needsManualCleanup = true;
        methods.push('manual-required');
        qualities.push('low');
        await updateRegionCleanupMetadata(region.id, { textColor: null, needsManualCleanup: true });
        continue;
      }
      try {
        const outcome = await cleanRegionPixels({
          decoded,
          originalBuffer: buffer,
          currentBuffer: cleanedBuffer,
          bbox: region.bbox,
          width: asset.width,
          height: asset.height,
          ocrNeedsReview,
        });
        // 정리 결과를 OCR로 다시 읽어 글자가 남았는지 확인하고, 남았거나 자동 정리를 포기했으면 이미지 편집
        // API로 그 영역만 다시 지운다(폴백을 켠 경우). 위치가 불확실한 영역은 이 단계에 오지 않는다.
        const verified = await verifyAndRepair({
          outcome, originalBuffer: buffer, previousBuffer: cleanedBuffer, bbox: region.bbox, width: asset.width, height: asset.height,
        });
        if (verified.kind === 'manual') {
          if (verified.textColor && (region.is_primary || primaryTextColor === null)) primaryTextColor = verified.textColor;
          needsManualCleanup = true;
          methods.push('manual-required');
          qualities.push('low');
          await updateRegionCleanupMetadata(region.id, { textColor: verified.textColor, needsManualCleanup: true });
          continue;
        }
        cleanedBuffer = verified.buffer;
        if (verified.textColor && (region.is_primary || primaryTextColor === null)) primaryTextColor = verified.textColor;
        methods.push(verified.method);
        qualities.push(verified.quality);
        // 글자가 남은 채로 끝났다면 성공으로 기록하지 않고 에디터가 수동 정리를 안내하게 한다.
        if (verified.residualText) needsManualCleanup = true;
        await updateRegionCleanupMetadata(region.id, { textColor: verified.textColor, needsManualCleanup: verified.residualText });
      } catch (error) {
        logger.warn({ err: error, assetId: asset.id, regionId: region.id }, 'OCR 영역 자동 정리 실패 — 다른 영역은 계속 처리합니다.');
        needsManualCleanup = true;
        methods.push('manual-required');
        qualities.push('low');
        await updateRegionCleanupMetadata(region.id, { textColor: null, needsManualCleanup: true });
      }
    }

    const cleanedPath = `projects/${asset.project_id}/cleaned/${asset.id}.png`;
    const hasAutomaticCleanup = methods.some((method) => method !== 'manual-required');
    if (hasAutomaticCleanup) await uploadToStorage(cleanedPath, cleanedBuffer, 'image/png');

    const method = aggregateMethod(methods);
    const quality: CleanupResult['quality'] = qualities.includes('low')
      ? 'low'
      : qualities.includes('acceptable') ? 'acceptable' : 'good';

    await updateAsset(asset.id, {
      status: 'completed',
      stage: 'cleaning',
      progress: 100,
      cleanedPath: hasAutomaticCleanup ? cleanedPath : null,
      cleanupMethod: method,
      cleanupQuality: quality,
      needsManualCleanup,
      textColor: primaryTextColor,
    });

    return {
      assetId: asset.id,
      method,
      quality,
      needsManualCleanup,
      ...(hasAutomaticCleanup ? { cleanedImagePath: cleanedPath } : {}),
    };
  } catch (err) {
    const { code: errorCode, message: errorMessage } = describeError(err, 'IMAGE_CLEANUP_FAILED', '이미지 정리 중 알 수 없는 오류가 발생했습니다.');
    await updateAsset(asset.id, { status: 'failed', stage: 'cleaning', errorCode, errorMessage });
    return { assetId: asset.id, method: 'manual-required', quality: 'low', needsManualCleanup: true };
  }
}

export async function runProjectCleanup(projectId: string): Promise<Array<CleanupResult & { assetId: string }>> {
  const assets = await findAssetsByProjectAndStatus(projectId, ['translating']);
  await updateProjectStage(projectId, { status: 'processing', stage: 'cleaning' });

  const results = await mapWithConcurrency(assets, env.CLEANUP_CONCURRENCY, runCleanupForAsset);

  return results;
}
