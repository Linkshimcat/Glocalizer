import { AppError } from '../errors/app-error.js';
import { findAssetsByProjectId } from '../repositories/asset.repository.js';
import { findRegionsByAssetId } from '../repositories/ocr.repository.js';
import { createSignedUrl } from '../repositories/storage.repository.js';
import { findProjectById } from '../repositories/project.repository.js';
import { findTranslationsByOcrRegionId } from '../repositories/translation.repository.js';
import { findEditorStatesByAssetId } from '../repositories/editor-state.repository.js';
import type { AssetRow } from '../types/asset.js';

async function buildAssetResult(asset: AssetRow) {
  const regions = await findRegionsByAssetId(asset.id);
  const primaryRegion = regions.find((region) => region.is_primary) ?? null;

  const translationsByRegion = new Map(await Promise.all(regions.map(async (region) => [
    region.id,
    await findTranslationsByOcrRegionId(region.id),
  ] as const)));
  const toLocalizations = (regionId: string) => Object.fromEntries(
    (translationsByRegion.get(regionId) ?? []).map((translation) => [translation.language_code, {
      candidates: translation.final_candidates,
      recommendedStyle: translation.recommended_style,
    }]),
  );
  const localizations = primaryRegion ? toLocalizations(primaryRegion.id) : {};

  const [originalUrl, cleanedUrl, editorStates] = await Promise.all([
    asset.original_path ? createSignedUrl(asset.original_path) : Promise.resolve(null),
    asset.cleaned_path ? createSignedUrl(asset.cleaned_path) : Promise.resolve(null),
    findEditorStatesByAssetId(asset.id),
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
      fontStyle: primaryRegion?.font_style ?? null,
      regions: regions.map((region) => ({
        id: region.id,
        text: region.detected_text,
        confidence: region.confidence,
        box: region.bbox,
        normalizedBox: region.normalized_bbox,
        source: region.source,
        agreementScore: region.agreement_score,
        needsManualReview: region.needs_manual_review,
        fontStyle: region.font_style,
        textColor: region.text_color ?? null,
        needsManualCleanup: region.needs_manual_cleanup ?? false,
        localizations: toLocalizations(region.id),
      })),
    },
    localizations,
    cleanup: {
      method: asset.cleanup_method,
      quality: asset.cleanup_quality,
      needsManualCleanup: asset.needs_manual_cleanup,
      textColor: asset.text_color,
    },
    needsManualOcrReview: primaryRegion?.needs_manual_review ?? false,
    editorStates: Object.fromEntries(editorStates.filter((state) => state.ocr_region_id === primaryRegion?.id).map((state) => [state.language_code, state.style])),
    regionEditorStates: Object.fromEntries(regions.map((region) => [
      region.id,
      Object.fromEntries(editorStates.filter((state) => state.ocr_region_id === region.id).map((state) => [state.language_code, state.style])),
    ])),
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
