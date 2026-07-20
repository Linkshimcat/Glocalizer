import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import { findAssetsByProjectAndStatus, updateAsset } from '../../repositories/asset.repository.js';
import { findPrimaryRegion } from '../../repositories/ocr.repository.js';
import { findProjectById, updateProjectStage } from '../../repositories/project.repository.js';
import { upsertTranslation } from '../../repositories/translation.repository.js';
import type { AssetRow } from '../../types/asset.js';
import { MAX_CHARACTERS_BY_LANGUAGE } from '../../types/localization.js';
import type { LocalizationPromptInput, TargetLanguage, TranslationCandidate, TranslationResult } from '../../types/localization.js';
import type { LocalizationOptions } from '../../types/project.js';
import type { OcrRegionRow } from '../../types/ocr.js';
import type { TranslationReviewResult } from '../../types/review.js';
import { GLM_LOCALIZATION_PROMPT_VERSION } from '../prompts/prompt-version.js';
import { needsDeepSeekReview } from '../review/review-decision.js';
import { tryReviewTranslation } from '../review/review.service.js';
import { glmLocalizationProvider } from './glm-localization.provider.js';
import { validateTranslationResult } from './localization-validator.js';

export function applyReviewResult(candidates: TranslationCandidate[], review: TranslationReviewResult): TranslationCandidate[] {
  const bestIndex = review.bestCandidateIndex >= 0 && review.bestCandidateIndex < candidates.length ? review.bestCandidateIndex : 0;
  const replacementByIndex = new Map(review.replacements?.map((replacement) => [replacement.index, replacement.text]) ?? []);

  return candidates.map((candidate, index) => ({
    ...candidate,
    text: replacementByIndex.get(index) ?? candidate.text,
    best: index === bestIndex,
  }));
}

export interface LanguageTranslationResult {
  languageCode: TargetLanguage;
  status: 'translated' | 'failed';
  needsReview?: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export interface AssetTranslationResult {
  assetId: string;
  status: 'translating' | 'failed';
  languages: LanguageTranslationResult[];
  errorCode?: string;
  errorMessage?: string;
}

async function localizeRegionForLanguage(
  region: OcrRegionRow,
  targetLanguage: TargetLanguage,
  options: LocalizationOptions,
): Promise<LanguageTranslationResult> {
  const input: LocalizationPromptInput = {
    sourceText: region.detected_text,
    sourceLanguage: 'ko',
    targetLanguage,
    context: {
      contentType: 'emoticon',
      tone: options.tone,
      audience: options.audience,
      translationStyle: options.translationStyle,
    },
    constraints: {
      maxCharacters: MAX_CHARACTERS_BY_LANGUAGE[targetLanguage],
      textBoxWidth: region.bbox.width,
      textBoxHeight: region.bbox.height,
    },
  };

  const result: TranslationResult = await glmLocalizationProvider.localize(input);
  const validation = validateTranslationResult(result);

  const shouldReview = needsDeepSeekReview({
    ocrConfidence: region.confidence,
    validation,
    highQualityMode: options.highQualityReview,
  });

  let finalCandidates: TranslationCandidate[] = result.candidates;
  let reviewResult: TranslationReviewResult | null = null;

  if (shouldReview) {
    reviewResult = await tryReviewTranslation({
      sourceText: region.detected_text,
      targetLanguage,
      candidates: result.candidates.map((candidate) => ({ text: candidate.text, tone: candidate.tone, meaning: candidate.meaning })),
      requirements: {
        maxCharacters: MAX_CHARACTERS_BY_LANGUAGE[targetLanguage],
        contentType: 'emoticon',
        desiredTone: options.tone,
      },
    });

    if (reviewResult) {
      finalCandidates = applyReviewResult(result.candidates, reviewResult);
    }
  }

  await upsertTranslation({
    ocrRegionId: region.id,
    languageCode: targetLanguage,
    glmCandidates: result.candidates,
    finalCandidates,
    recommendedStyle: result.recommendedStyle,
    generationModel: env.NVIDIA_TRANSLATION_MODEL,
    ...(reviewResult ? { reviewModel: env.NVIDIA_REVIEW_MODEL, reviewResult } : {}),
    promptVersion: GLM_LOCALIZATION_PROMPT_VERSION,
  });

  // 검수가 실제로 통과했다면 needsReview를 내려도 되지만, 검수를 안 했거나(shouldReview=false) 실패했다면
  // 로컬 검증 결과를 그대로 신호로 남긴다.
  const finalNeedsReview = reviewResult ? !reviewResult.approved : validation.needsReview;

  return { languageCode: targetLanguage, status: 'translated', needsReview: finalNeedsReview };
}

export async function runTranslationsForAsset(
  asset: AssetRow,
  targetLanguages: TargetLanguage[],
  options: LocalizationOptions,
): Promise<AssetTranslationResult> {
  const region = await findPrimaryRegion(asset.id);
  if (!region) {
    const errorMessage = '대표 OCR 영역을 찾을 수 없어 번역을 진행할 수 없습니다.';
    await updateAsset(asset.id, { status: 'failed', stage: 'translating', errorCode: 'OCR_TEXT_NOT_FOUND', errorMessage });
    return { assetId: asset.id, status: 'failed', languages: [], errorCode: 'OCR_TEXT_NOT_FOUND', errorMessage };
  }

  const languages: LanguageTranslationResult[] = [];
  for (const targetLanguage of targetLanguages) {
    try {
      languages.push(await localizeRegionForLanguage(region, targetLanguage, options));
    } catch (err) {
      const errorCode = err instanceof AppError ? err.code : 'GLM_TRANSLATION_FAILED';
      const errorMessage = err instanceof AppError ? err.message : '번역 처리 중 알 수 없는 오류가 발생했습니다.';
      languages.push({ languageCode: targetLanguage, status: 'failed', errorCode, errorMessage });
    }
  }

  const allFailed = languages.length > 0 && languages.every((language) => language.status === 'failed');
  if (allFailed) {
    const errorMessage = '모든 언어의 번역이 실패했습니다.';
    await updateAsset(asset.id, { status: 'failed', stage: 'translating', errorCode: 'GLM_TRANSLATION_FAILED', errorMessage });
    return { assetId: asset.id, status: 'failed', languages, errorCode: 'GLM_TRANSLATION_FAILED', errorMessage };
  }

  await updateAsset(asset.id, { status: 'translating', stage: 'translating', progress: 100 });
  return { assetId: asset.id, status: 'translating', languages };
}

export async function runProjectTranslations(projectId: string): Promise<AssetTranslationResult[]> {
  const project = await findProjectById(projectId);
  if (!project) {
    throw new AppError('PROJECT_NOT_FOUND', { projectId });
  }

  const assets = await findAssetsByProjectAndStatus(projectId, ['ocr']);
  await updateProjectStage(projectId, { status: 'processing', stage: 'translating', progress: 0 });

  const results: AssetTranslationResult[] = [];
  for (const asset of assets) {
    results.push(
      await runTranslationsForAsset(asset, project.target_languages, project.localization_options),
    );
  }

  const allFailed = results.length > 0 && results.every((result) => result.status === 'failed');
  await updateProjectStage(projectId, {
    stage: 'translating',
    progress: 100,
    ...(allFailed ? { status: 'failed', errorCode: 'GLM_TRANSLATION_FAILED' } : {}),
  });

  return results;
}
