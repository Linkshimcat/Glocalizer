import { AppError } from '../errors/app-error.js';
import { findAssetsByProjectId } from '../repositories/asset.repository.js';
import { findRegionsByAssetId } from '../repositories/ocr.repository.js';
import { createSignedUrl } from '../repositories/storage.repository.js';
import { findProjectById } from '../repositories/project.repository.js';
import { findTranslationsByOcrRegionId } from '../repositories/translation.repository.js';
import type { AssetRow } from '../types/asset.js';

async function buildRegionLocalizations(regionId: string) {
  const translations = await findTranslationsByOcrRegionId(regionId);
  const localizations: Record<string, { candidates: unknown; recommendedStyle: unknown }> = {};
  for (const translation of translations) {
    localizations[translation.language_code] = {
      candidates: translation.final_candidates,
      recommendedStyle: translation.recommended_style,
    };
  }
  return localizations;
}

async function buildAssetResult(asset: AssetRow) {
  const regions = await findRegionsByAssetId(asset.id);
  const primaryRegion = regions.find((region) => region.is_primary) ?? null;

  // 각 영역이 자기 번역 후보를 들고 있게 한다. (다중 텍스트 영역 지원)
  const regionsWithLocalizations = await Promise.all(
    regions.map(async (region) => ({
      id: region.id,
      text: region.detected_text,
      confidence: region.confidence,
      box: region.bbox,
      localizations: await buildRegionLocalizations(region.id),
    })),
  );

  // 하위 호환: 최상위 localizations는 대표 영역 기준 (구 프론트가 있을 때 대비)
  const localizations = primaryRegion
    ? regionsWithLocalizations.find((region) => region.id === primaryRegion.id)?.localizations ?? {}
    : {};

  const [originalUrl, cleanedUrl] = await Promise.all([
    asset.original_path ? createSignedUrl(asset.original_path) : Promise.resolve(null),
    asset.cleaned_path ? createSignedUrl(asset.cleaned_path) : Promise.resolve(null),
  ]);

  return {
    id: asset.id,
    name: asset.original_name,
    type: asset.mime_type,
    width: asset.width,
    height: asset.height,
    status: asset.status,
    originalUrl,
    cleanedUrl,
    ocr: {
      fullText: primaryRegion?.detected_text ?? null,
      primaryRegionId: primaryRegion?.id ?? null,
      regions: regionsWithLocalizations,
    },
    localizations,
    cleanup: {
      method: asset.cleanup_method,
      quality: asset.cleanup_quality,
      needsManualCleanup: asset.needs_manual_cleanup,
    },
    ...(asset.error_code ? { errorCode: asset.error_code, errorMessage: asset.error_message } : {}),
  };
}

export async function getProjectResults(projectId: string) {
  const project = await findProjectById(projectId);
  if (!project) {
    throw new AppError('PROJECT_NOT_FOUND', { projectId });
  }

  const assets = await findAssetsByProjectId(projectId);
  const assetResults = await Promise.all(assets.map((asset) => buildAssetResult(asset)));

  return {
    projectId: project.id,
    status: project.status,
    targetLanguages: project.target_languages,
    assets: assetResults,
  };
}
