import { containsHanScript, containsJapaneseKana, containsKorean } from '../../utils/language.js';
import { MAX_CHARACTERS_BY_LANGUAGE } from '../../types/localization.js';
import type { TargetLanguage, TranslationResult, TranslationValidationResult } from '../../types/localization.js';

// MVP 최소 세트. 필요해지면 확장한다.
const BANNED_PATTERN = /\b(fuck|shit|bitch|nigger|cunt)\b/i;

function hasTargetScript(text: string, targetLanguage: TargetLanguage): boolean {
  if (targetLanguage === 'ja') return containsJapaneseKana(text) || containsHanScript(text);
  if (targetLanguage === 'zh') return containsHanScript(text);
  return true; // en은 별도 문자체계 검사 없음
}

export function validateTranslationResult(result: TranslationResult): TranslationValidationResult {
  const reasons: string[] = [];
  let valid = true;
  let needsReview = false;

  const { candidates, targetLanguage } = result;
  const maxCharacters = MAX_CHARACTERS_BY_LANGUAGE[targetLanguage];

  if (candidates.length !== 3) {
    valid = false;
    reasons.push(`후보 개수가 3개가 아닙니다 (${candidates.length}개).`);
  }

  const emptyCount = candidates.filter((candidate) => candidate.text.trim().length === 0).length;
  if (emptyCount > 0) {
    valid = false;
    reasons.push('빈 후보가 포함되어 있습니다.');
  }

  const bestCount = candidates.filter((candidate) => candidate.best).length;
  if (bestCount !== 1) {
    valid = false;
    reasons.push(`best 후보가 정확히 1개여야 하는데 ${bestCount}개입니다.`);
  }

  const normalizedTexts = candidates.map((candidate) => candidate.text.trim().toLowerCase());
  const hasDuplicates = new Set(normalizedTexts).size !== normalizedTexts.length;
  if (hasDuplicates) {
    needsReview = true;
    reasons.push('후보 중 동일하거나 거의 같은 표현이 있습니다.');
  }

  for (const candidate of candidates) {
    if (candidate.text.length > maxCharacters) {
      needsReview = true;
      reasons.push(`"${candidate.text}"가 최대 길이(${maxCharacters}자)를 초과합니다.`);
    }
    if (containsKorean(candidate.text)) {
      needsReview = true;
      reasons.push(`"${candidate.text}"에 한글이 남아 있습니다.`);
    }
    if (!hasTargetScript(candidate.text, targetLanguage)) {
      needsReview = true;
      reasons.push(`"${candidate.text}"가 타겟 언어(${targetLanguage}) 문자 체계를 포함하지 않습니다.`);
    }
    if (BANNED_PATTERN.test(candidate.text)) {
      valid = false;
      reasons.push(`"${candidate.text}"에 금지된 표현이 포함되어 있습니다.`);
    }
  }

  return { valid, needsReview, reasons };
}
