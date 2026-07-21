import { describe, expect, it } from 'vitest';
import { validateTranslationResult } from '../../src/ai/localization/localization-validator.js';
import type { TargetLanguage, TranslationCandidate, TranslationResult } from '../../src/types/localization.js';

function candidate(text: string, best = false): TranslationCandidate {
  return { text, tone: 'casual', meaning: '뜻', best };
}

function result(targetLanguage: TargetLanguage, candidates: TranslationCandidate[]): TranslationResult {
  return {
    sourceText: '원문',
    targetLanguage,
    candidates,
    recommendedStyle: { fontCategory: 'bold', alignment: 'center', strokeRecommended: false, shadowRecommended: false },
  };
}

describe('validateTranslationResult', () => {
  it('정상적인 영어 후보 3개는 valid=true, needsReview=false', () => {
    const r = result('en', [candidate('Study hard!', true), candidate('Grind time'), candidate('Focus mode')]);
    expect(validateTranslationResult(r)).toEqual({ valid: true, needsReview: false, reasons: [] });
  });

  it('후보가 3개가 아니면 invalid', () => {
    const r = result('en', [candidate('a', true), candidate('b')]);
    const v = validateTranslationResult(r);
    expect(v.valid).toBe(false);
  });

  it('best가 0개 또는 2개 이상이면 invalid', () => {
    const noBest = result('en', [candidate('a'), candidate('b'), candidate('c')]);
    expect(validateTranslationResult(noBest).valid).toBe(false);

    const twoBest = result('en', [candidate('a', true), candidate('b', true), candidate('c')]);
    expect(validateTranslationResult(twoBest).valid).toBe(false);
  });

  it('빈 후보가 있으면 invalid', () => {
    const r = result('en', [candidate(''), candidate('b', true), candidate('c')]);
    expect(validateTranslationResult(r).valid).toBe(false);
  });

  it('중복 후보는 valid하지만 needsReview=true', () => {
    const r = result('en', [candidate('Same', true), candidate('Same'), candidate('Different')]);
    const v = validateTranslationResult(r);
    expect(v.valid).toBe(true);
    expect(v.needsReview).toBe(true);
  });

  it('최대 길이를 초과하면 needsReview=true', () => {
    const tooLong = 'This sentence is way way way too long for an emoticon';
    const r = result('en', [candidate(tooLong, true), candidate('b'), candidate('c')]);
    expect(validateTranslationResult(r).needsReview).toBe(true);
  });

  it('영어 후보에 한글이 남아있으면 needsReview=true', () => {
    const r = result('en', [candidate('완전 study', true), candidate('b'), candidate('c')]);
    expect(validateTranslationResult(r).needsReview).toBe(true);
  });

  it('일본어 후보는 가나/한자가 없으면 needsReview=true', () => {
    const r = result('ja', [candidate('OK', true), candidate('yo'), candidate('go')]);
    expect(validateTranslationResult(r).needsReview).toBe(true);
  });

  it('일본어 후보에 가나가 있으면 통과한다', () => {
    const r = result('ja', [candidate('やばい', true), candidate('すごい'), candidate('神')]);
    expect(validateTranslationResult(r).needsReview).toBe(false);
  });

  it('중국어 후보는 한자가 없으면 needsReview=true', () => {
    const r = result('zh', [candidate('OK', true), candidate('yo'), candidate('go')]);
    expect(validateTranslationResult(r).needsReview).toBe(true);
  });

  it('금지 표현이 포함되면 invalid', () => {
    const r = result('en', [candidate('this is shit', true), candidate('b'), candidate('c')]);
    expect(validateTranslationResult(r).valid).toBe(false);
  });
});
