import { translationBatchResponseSchema } from '../schemas/localization.schema.js';
import { AppError } from '../errors/app-error.js';
import type { LocalizationBatchInput } from '../ai/localization/localization-provider.types.js';
import type { TargetLanguage, TranslationResult } from '../types/localization.js';

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function parseJsonContent(content: string): unknown {
  const withoutFence = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const firstObject = withoutFence.indexOf('{');
  const lastObject = withoutFence.lastIndexOf('}');
  const json = firstObject >= 0 && lastObject > firstObject
    ? withoutFence.slice(firstObject, lastObject + 1)
    : withoutFence;
  try {
    return JSON.parse(json);
  } catch {
    throw new AppError('TRANSLATION_PROVIDER_FAILED', undefined, '번역 provider가 유효한 JSON을 반환하지 않았습니다.');
  }
}

function normalizeLanguage(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const normalized = value.toLowerCase().replace('_', '-');
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en';
  if (normalized === 'ja' || normalized.startsWith('ja-')) return 'ja';
  if (normalized === 'zh' || normalized.startsWith('zh-')) return 'zh';
  return value;
}

/** Provider별 사소한 key 생략/별칭을 정식 응답으로 맞춘다. 번역 문구 자체는 바꾸지 않는다. */
function normalizeProviderPayload(raw: unknown): unknown {
  const payload = Array.isArray(raw) ? { translations: raw } : asRecord(raw);
  if (!payload) return raw;
  const translations = Array.isArray(payload.translations)
    ? payload.translations
    : Array.isArray(payload.results)
      ? payload.results
      : null;
  if (!translations) return raw;

  return {
    ...payload,
    translations: translations.map((value) => {
      const translation = asRecord(value);
      if (!translation) return value;
      const rawCandidates = Array.isArray(translation.candidates)
        ? translation.candidates
        : Array.isArray(translation.suggestions)
          ? translation.suggestions
          : Array.isArray(translation.options)
            ? translation.options
            : translation.translation ? [translation.translation] : [];
      const candidates = rawCandidates.slice(0, 3).map((candidate) => {
        if (typeof candidate === 'string') return { text: candidate };
        const candidateRecord = asRecord(candidate);
        if (!candidateRecord) return candidate;
        return {
          ...candidateRecord,
          text: candidateRecord.text ?? candidateRecord.translation ?? candidateRecord.value,
        };
      });
      return {
        ...translation,
        languageCode: normalizeLanguage(translation.languageCode ?? translation.language ?? translation.targetLanguage),
        candidates,
        recommendedStyle: translation.recommendedStyle ?? translation.style ?? {},
      };
    }),
  };
}

function normalizeBestCandidate(result: TranslationResult): TranslationResult {
  const bestIndex = result.candidates.findIndex((candidate) => candidate.best);
  const selectedIndex = bestIndex >= 0 ? bestIndex : 0;
  return {
    ...result,
    candidates: result.candidates.map((candidate, index) => ({ ...candidate, best: index === selectedIndex })),
  };
}

export function parseTranslationResponse(content: string, input: LocalizationBatchInput): Map<TargetLanguage, TranslationResult> {
  let raw: unknown;
  try {
    raw = parseJsonContent(content);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('TRANSLATION_PROVIDER_FAILED', undefined, '번역 provider가 유효한 JSON을 반환하지 않았습니다.');
  }

  const parsed = translationBatchResponseSchema.safeParse(normalizeProviderPayload(raw));
  if (!parsed.success) {
    throw new AppError('TRANSLATION_PROVIDER_FAILED', undefined, '번역 provider 응답이 예상한 스키마와 다릅니다.');
  }

  const byLanguage = new Map<TargetLanguage, TranslationResult>();
  for (const translation of parsed.data.translations) {
    // 일부 모델은 schema enum에 있는 언어를 추가로 반환한다. 요청한 언어만 저장한다.
    if (!input.targetLanguages.includes(translation.languageCode)) continue;
    if (byLanguage.has(translation.languageCode)) {
      throw new AppError('TRANSLATION_PROVIDER_FAILED', { languageCode: translation.languageCode }, '동일한 번역 언어가 중복 반환되었습니다.');
    }
    byLanguage.set(translation.languageCode, normalizeBestCandidate({
      sourceText: input.sourceText,
      targetLanguage: translation.languageCode,
      candidates: translation.candidates,
      recommendedStyle: translation.recommendedStyle,
    }));
  }

  if (byLanguage.size !== input.targetLanguages.length) {
    throw new AppError('TRANSLATION_PROVIDER_FAILED', undefined, '일부 요청 언어의 번역이 누락되었습니다.');
  }
  return byLanguage;
}
