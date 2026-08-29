import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { AppError, describeError } from '../../errors/app-error.js';
import { findAssetsByProjectAndStatus, updateAsset } from '../../repositories/asset.repository.js';
import { findRegionById, findRegionsByAssetId } from '../../repositories/ocr.repository.js';
import { findProjectById, updateProjectStage } from '../../repositories/project.repository.js';
import { findTranslation, incrementRegenerateCount, upsertTranslation } from '../../repositories/translation.repository.js';
import type { AssetRow } from '../../types/asset.js';
import { MAX_CHARACTERS_BY_LANGUAGE } from '../../types/localization.js';
import type { TargetLanguage } from '../../types/localization.js';
import type { LocalizationOptions } from '../../types/project.js';
import type { OcrRegionRow } from '../../types/ocr.js';
import { mapWithConcurrency } from '../../utils/concurrency.js';
import { LOCALIZATION_PROMPT_VERSION } from '../prompts/prompt-version.js';
import { getTranslationProvider } from '../../translation/translation-provider.js';
import { validateTranslationResult } from './localization-validator.js';
import type { LocalizationBatchInput } from './localization-provider.types.js';

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

function buildLocalizationInput(
  region: OcrRegionRow,
  targetLanguages: TargetLanguage[],
  options: LocalizationOptions,
  siblingCaptions: string[] = [],
): LocalizationBatchInput {
  return {
    sourceText: region.detected_text,
    sourceLanguage: 'ko',
    targetLanguages,
    context: {
      contentType: 'emoticon',
      tone: options.tone,
      audience: options.audience,
      translationStyle: options.translationStyle,
      siblingCaptions,
    },
    constraintsByLanguage: Object.fromEntries(
      targetLanguages.map((languageCode) => [
        languageCode,
        {
          maxCharacters: MAX_CHARACTERS_BY_LANGUAGE[languageCode],
          textBoxWidth: region.bbox.width,
          textBoxHeight: region.bbox.height,
        },
      ]),
    ) as LocalizationBatchInput['constraintsByLanguage'],
  };
}

export async function localizeRegionForLanguages(
  region: OcrRegionRow,
  targetLanguages: TargetLanguage[],
  options: LocalizationOptions,
  siblingCaptions: string[] = [],
): Promise<LanguageTranslationResult[]> {
  const provider = getTranslationProvider();
  const failedResult = (languageCode: TargetLanguage, error: unknown): LanguageTranslationResult => {
    const { code: errorCode, message: errorMessage } = describeError(
      error,
      'TRANSLATION_PROVIDER_FAILED',
      '번역 처리 중 알 수 없는 오류가 발생했습니다.',
    );
    return { languageCode, status: 'failed', errorCode, errorMessage };
  };

  const persistResult = async (
    languageCode: TargetLanguage,
    results: Awaited<ReturnType<typeof provider.localizeBatch>>,
  ): Promise<LanguageTranslationResult> => {
    try {
      const result = results.get(languageCode);
      if (!result) {
        throw new AppError('TRANSLATION_PROVIDER_FAILED', { languageCode }, '번역 provider가 요청 언어를 반환하지 않았습니다.');
      }

      const validation = validateTranslationResult(result);
      if (!validation.valid) {
        throw new AppError('TRANSLATION_PROVIDER_FAILED', { languageCode, reasons: validation.reasons }, '번역 결과가 검증을 통과하지 못했습니다.');
      }

      await upsertTranslation({
        ocrRegionId: region.id,
        languageCode,
        generationCandidates: result.candidates,
        finalCandidates: result.candidates,
        recommendedStyle: result.recommendedStyle,
        generationModel: provider.model,
        promptVersion: LOCALIZATION_PROMPT_VERSION,
      });

      return { languageCode, status: 'translated', needsReview: validation.needsReview };
    } catch (error) {
      return failedResult(languageCode, error);
    }
  };

  let batchResults: Awaited<ReturnType<typeof provider.localizeBatch>> | null = null;
  let batchError: unknown = null;
  try {
    batchResults = await provider.localizeBatch(buildLocalizationInput(region, targetLanguages, options, siblingCaptions));
  } catch (error) {
    batchError = error;
  }

  const firstPass = await Promise.all(targetLanguages.map((languageCode) => (
    batchResults ? persistResult(languageCode, batchResults) : Promise.resolve(failedResult(languageCode, batchError))
  )));
  const failedLanguages = firstPass.filter((result) => result.status === 'failed').map((result) => result.languageCode);
  if (failedLanguages.length === 0) return firstPass;

  // 한 언어의 누락/형식 오류가 같은 캡션의 다른 언어까지 버리지 않도록 실패 언어만
  // 단일 언어 요청으로 한 번 더 복구한다. provider 내부 HTTP 재시도와는 별도 단계다.
  const retryResults: LanguageTranslationResult[] = [];
  for (const languageCode of failedLanguages) {
    try {
      const result = await provider.localizeBatch(buildLocalizationInput(region, [languageCode], options, siblingCaptions));
      retryResults.push(await persistResult(languageCode, result));
    } catch (error) {
      retryResults.push(failedResult(languageCode, error));
    }
  }
  const retriedByLanguage = new Map(retryResults.map((result) => [result.languageCode, result]));
  return firstPass.map((result) => result.status === 'translated'
    ? result
    : retriedByLanguage.get(result.languageCode) ?? result);
}

export async function runTranslationsForAsset(
  asset: AssetRow,
  targetLanguages: TargetLanguage[],
  options: LocalizationOptions,
): Promise<AssetTranslationResult> {
  const regions = (await findRegionsByAssetId(asset.id)).filter((region) => region.contains_korean);
  if (regions.length === 0) {
    const errorMessage = '번역할 한국어 OCR 영역을 찾을 수 없습니다.';
    await updateAsset(asset.id, { status: 'failed', stage: 'translating', errorCode: 'OCR_TEXT_NOT_FOUND', errorMessage });
    return { assetId: asset.id, status: 'failed', languages: [], errorCode: 'OCR_TEXT_NOT_FOUND', errorMessage };
  }

  const regionResults = await mapWithConcurrency(regions, env.AI_CONCURRENCY, async (region) => ({
    region,
    languages: await localizeRegionForLanguages(
      region,
      targetLanguages,
      options,
      regions.filter((candidate) => candidate.id !== region.id).map((candidate) => candidate.detected_text),
    ),
  }));
  const languages = targetLanguages.map((languageCode): LanguageTranslationResult => {
    const results = regionResults.map(({ languages: values }) => values.find((value) => value.languageCode === languageCode));
    const succeeded = results.length === regions.length
      && results.every((result) => result?.status === 'translated');
    const failure = results.find((result) => result?.status === 'failed');
    return succeeded
      ? { languageCode, status: 'translated', needsReview: results.some((result) => result?.needsReview) }
      : { languageCode, status: 'failed', errorCode: failure?.errorCode, errorMessage: failure?.errorMessage };
  });
  const failedRegionCount = regionResults.filter(({ languages: values }) => (
    targetLanguages.some((languageCode) => values.find((value) => value.languageCode === languageCode)?.status !== 'translated')
  )).length;
  const hasFailure = failedRegionCount > 0 || languages.some((language) => language.status === 'failed');
  if (hasFailure) {
    const providerMessage = languages.find((language) => language.errorMessage)?.errorMessage;
    const errorMessage = `${regions.length}개 OCR 영역 중 ${failedRegionCount}개 영역의 번역을 완료하지 못했습니다.${providerMessage ? ` ${providerMessage}` : ''}`;
    const errorCode = languages.find((language) => language.errorCode)?.errorCode ?? 'TRANSLATION_PROVIDER_FAILED';
    logger.warn({
      assetId: asset.id,
      projectId: asset.project_id,
      errorCode,
      failedRegionCount,
      totalRegionCount: regions.length,
      languageCodes: targetLanguages,
    }, 'Asset OCR 영역 번역 미완료');
    await updateAsset(asset.id, { status: 'failed', stage: 'translating', errorCode: 'TRANSLATION_PROVIDER_FAILED', errorMessage });
    return { assetId: asset.id, status: 'failed', languages, errorCode: 'TRANSLATION_PROVIDER_FAILED', errorMessage };
  }

  await updateAsset(asset.id, { status: 'translating', stage: 'translating', progress: 100 });
  return { assetId: asset.id, status: 'translating', languages };
}

export async function runProjectTranslations(projectId: string): Promise<AssetTranslationResult[]> {
  const project = await findProjectById(projectId);
  if (!project) throw new AppError('PROJECT_NOT_FOUND', { projectId });

  const assets = await findAssetsByProjectAndStatus(projectId, ['ocr']);
  await updateProjectStage(projectId, { status: 'processing', stage: 'translating' });
  const results = await mapWithConcurrency(assets, env.AI_CONCURRENCY, (asset) =>
    runTranslationsForAsset(asset, project.target_languages, project.localization_options),
  );

  if (results.length > 0 && results.every((result) => result.status === 'failed')) {
    await updateProjectStage(projectId, { stage: 'translating', status: 'failed', errorCode: 'TRANSLATION_PROVIDER_FAILED' });
  }
  return results;
}

interface RegenerateOverrides {
  tone?: LocalizationOptions['tone'];
  translationStyle?: LocalizationOptions['translationStyle'];
}

export async function regenerateTranslation(
  projectId: string,
  assetId: string,
  regionId: string,
  targetLanguage: TargetLanguage,
  overrides: RegenerateOverrides,
): Promise<LanguageTranslationResult> {
  const project = await findProjectById(projectId);
  if (!project) throw new AppError('PROJECT_NOT_FOUND', { projectId });

  const region = await findRegionById(regionId);
  if (!region || region.asset_id !== assetId) {
    throw new AppError('INVALID_REQUEST', { regionId }, '해당 이미지에 속하지 않는 OCR 영역입니다.');
  }

  const existing = await findTranslation(regionId, targetLanguage);
  const currentCount = existing?.regenerate_count ?? 0;
  if (currentCount >= env.MAX_REGENERATE_COUNT) {
    throw new AppError('RATE_LIMITED', { regionId, targetLanguage, limit: env.MAX_REGENERATE_COUNT }, `번역 재생성은 최대 ${env.MAX_REGENERATE_COUNT}회까지 가능합니다.`);
  }

  const options: LocalizationOptions = {
    ...project.localization_options,
    tone: overrides.tone ?? project.localization_options.tone,
    translationStyle: overrides.translationStyle ?? project.localization_options.translationStyle,
  };
  const siblingCaptions = (await findRegionsByAssetId(assetId))
    .filter((candidate) => candidate.id !== region.id && candidate.contains_korean)
    .map((candidate) => candidate.detected_text);
  const [result] = await localizeRegionForLanguages(region, [targetLanguage], options, siblingCaptions);
  if (result.status === 'failed') {
    throw new AppError('TRANSLATION_PROVIDER_FAILED', undefined, result.errorMessage);
  }

  await incrementRegenerateCount(regionId, targetLanguage, currentCount + 1);
  return result;
}
