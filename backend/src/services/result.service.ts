import { AppError } from '../errors/app-error.js';
import { findAssetsByProjectId } from '../repositories/asset.repository.js';
import { findRegionsByAssetIds } from '../repositories/ocr.repository.js';
import { createSignedUrl } from '../repositories/storage.repository.js';
import { findProjectById } from '../repositories/project.repository.js';
import { findTranslationsByOcrRegionIds } from '../repositories/translation.repository.js';
import { findEditorStatesByAssetIds, type EditorStateRow } from '../repositories/editor-state.repository.js';
import type { AssetRow } from '../types/asset.js';
import type { TargetLanguage } from '../types/project.js';
import type { OcrRegionRow } from '../types/ocr.js';
import type { TranslationRow } from '../types/translation.js';

async function buildAssetResult(
  asset: AssetRow,
  targetLanguages: TargetLanguage[],
  regions: OcrRegionRow[],
  translations: TranslationRow[],
  editorStates: EditorStateRow[],
) {
  const primaryRegion = regions.find((region) => region.is_primary) ?? null;

  const translationsByRegion = new Map<string, typeof translations>();
  for (const translation of translations) {
    const regionTranslations = translationsByRegion.get(translation.ocr_region_id) ?? [];
    regionTranslations.push(translation);
    translationsByRegion.set(translation.ocr_region_id, regionTranslations);
  }
  const toLocalizations = (regionId: string) => {
    const translations = translationsByRegion.get(regionId) ?? [];
    return Object.fromEntries(targetLanguages.map((languageCode) => {
      const translation = translations.find((candidate) => candidate.language_code === languageCode);
      return [languageCode, translation
        ? { status: 'translated', candidates: translation.final_candidates, recommendedStyle: translation.recommended_style }
        : { status: 'failed', candidates: [], recommendedStyle: null }];
    }));
  };
  const localizations = primaryRegion ? toLocalizations(primaryRegion.id) : {};

  const [originalUrl, cleanedUrl] = await Promise.all([
    asset.original_path ? createSignedUrl(asset.original_path) : Promise.resolve(null),
    asset.cleaned_path ? createSignedUrl(asset.cleaned_path) : Promise.resolve(null),
  ]);
  const editorStatesByRegion = new Map<string, typeof editorStates>();
  for (const state of editorStates) {
    const regionStates = editorStatesByRegion.get(state.ocr_region_id) ?? [];
    regionStates.push(state);
    editorStatesByRegion.set(state.ocr_region_id, regionStates);
  }

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
    editorStates: Object.fromEntries((editorStatesByRegion.get(primaryRegion?.id ?? '') ?? []).map((state) => [state.language_code, state.style])),
    regionEditorStates: Object.fromEntries(regions.map((region) => [
      region.id,
      Object.fromEntries((editorStatesByRegion.get(region.id) ?? []).map((state) => [state.language_code, state.style])),
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
  const assetIds = assets.map((asset) => asset.id);
  const [regions, editorStates] = await Promise.all([
    findRegionsByAssetIds(assetIds),
    findEditorStatesByAssetIds(assetIds),
  ]);
  const translations = await findTranslationsByOcrRegionIds(regions.map((region) => region.id));
  const regionsByAsset = new Map<string, OcrRegionRow[]>();
  for (const region of regions) {
    const assetRegions = regionsByAsset.get(region.asset_id) ?? [];
    assetRegions.push(region);
    regionsByAsset.set(region.asset_id, assetRegions);
  }
  const editorStatesByAsset = new Map<string, EditorStateRow[]>();
  for (const state of editorStates) {
    const assetStates = editorStatesByAsset.get(state.asset_id) ?? [];
    assetStates.push(state);
    editorStatesByAsset.set(state.asset_id, assetStates);
  }
  const assetIdByRegion = new Map(regions.map((region) => [region.id, region.asset_id]));
  const translationsByAsset = new Map<string, TranslationRow[]>();
  for (const translation of translations) {
    const assetId = assetIdByRegion.get(translation.ocr_region_id);
    if (!assetId) continue;
    const assetTranslations = translationsByAsset.get(assetId) ?? [];
    assetTranslations.push(translation);
    translationsByAsset.set(assetId, assetTranslations);
  }
  const assetResults = await Promise.all(assets.map((asset) => buildAssetResult(
    asset,
    project.target_languages,
    regionsByAsset.get(asset.id) ?? [],
    translationsByAsset.get(asset.id) ?? [],
    editorStatesByAsset.get(asset.id) ?? [],
  )));

  return {
    projectId: project.id,
    status: project.status,
    targetLanguages: project.target_languages,
    assets: assetResults,
  };
}
