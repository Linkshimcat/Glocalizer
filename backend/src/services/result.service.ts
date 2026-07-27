import { AppError } from '../errors/app-error.js';
import { findAssetsByProjectId } from '../repositories/asset.repository.js';
import { findRegionsByAssetId } from '../repositories/ocr.repository.js';
import { createSignedUrl } from '../repositories/storage.repository.js';
import { findProjectById } from '../repositories/project.repository.js';
import { findTranslationsByOcrRegionId } from '../repositories/translation.repository.js';
import { findEditorStatesByAssetId } from '../repositories/editor-state.repository.js';
import type { AssetRow } from '../types/asset.js';

type LangLocalization = { candidates: unknown; recommendedStyle: unknown };

async function buildAssetResult(asset: AssetRow) {
  const regions = await findRegionsByAssetId(asset.id);
  const primaryRegion = regions.find((region) => region.is_primary) ?? null;

  // 영역별 번역을 모두 조회한다(여러 블록·긴 문장 대응).
  const localizationsByRegion = new Map<string, Record<string, LangLocalization>>();
  await Promise.all(
    regions.map(async (region) => {
      const translations = await findTranslationsByOcrRegionId(region.id);
      const byLang: Record<string, LangLocalization> = {};
      for (const translation of translations) {
        byLang[translation.language_code] = {
          candidates: translation.final_candidates,
          recommendedStyle: translation.recommended_style,
        };
      }
      localizationsByRegion.set(region.id, byLang);
    }),
  );

  // 하위호환: top-level localizations는 대표 영역 기준을 유지한다.
  const localizations: Record<string, LangLocalization> = primaryRegion
    ? localizationsByRegion.get(primaryRegion.id) ?? {}
    : {};

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
      regions: regions.map((region) => ({
        id: region.id,
        text: region.detected_text,
        confidence: region.confidence,
        box: region.bbox,
        normalizedBox: region.normalized_bbox,
        source: region.source,
        agreementScore: region.agreement_score,
        needsManualReview: region.needs_manual_review,
        containsKorean: region.contains_korean,
        isPrimary: region.is_primary,
        localizations: localizationsByRegion.get(region.id) ?? {},
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
    editorStates: Object.fromEntries(editorStates.map((state) => [state.language_code, state.style])),
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
