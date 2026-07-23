import { describe, expect, it } from 'vitest';
import { parseTranslationResponse } from '../../src/translation/translation-response.parser.js';
import type { LocalizationBatchInput } from '../../src/ai/localization/localization-provider.types.js';

const input: LocalizationBatchInput = {
  sourceText: '열공 중',
  sourceLanguage: 'ko',
  targetLanguages: ['en'],
  context: { contentType: 'emoticon', tone: 'funny', audience: 'teen', translationStyle: 'natural' },
  constraintsByLanguage: { en: { maxCharacters: 18, textBoxWidth: 100, textBoxHeight: 30 } },
};

const validResponse = JSON.stringify({
  translations: [{
    languageCode: 'en',
    candidates: [
      { text: 'Study mode', tone: 'casual', meaning: '공부 모드', best: true },
      { text: 'Focus time', tone: 'casual', meaning: '집중 시간', best: false },
      { text: 'On the grind', tone: 'trendy', meaning: '열심히 하는 중', best: false },
    ],
    recommendedStyle: { fontCategory: 'bold', alignment: 'center', strokeRecommended: false, shadowRecommended: false },
  }],
});

describe('parseTranslationResponse', () => {
  it('provider 이름과 무관하게 유효한 번역 JSON을 파싱한다', () => {
    expect(parseTranslationResponse(validResponse, input).get('en')?.sourceText).toBe('열공 중');
  });

  it('provider가 추가 언어를 반환해도 요청한 언어 결과만 사용한다', () => {
    const payload = JSON.parse(validResponse) as { translations: unknown[] };
    payload.translations.push({
      languageCode: 'ja',
      candidates: [
        { text: '勉強中', tone: 'casual', meaning: '공부 중', best: true },
        { text: '集中', tone: 'casual', meaning: '집중', best: false },
        { text: 'ファイト', tone: 'cute', meaning: '파이팅', best: false },
      ],
      recommendedStyle: { fontCategory: 'bold', alignment: 'center', strokeRecommended: false, shadowRecommended: false },
    });
    expect(parseTranslationResponse(JSON.stringify(payload), input).size).toBe(1);
  });

  it('false로 생략된 best 값을 보완한다', () => {
    const payload = JSON.parse(validResponse) as { translations: Array<{ candidates: Array<Record<string, unknown>> }> };
    delete payload.translations[0].candidates[1].best;
    delete payload.translations[0].candidates[2].best;
    const candidates = parseTranslationResponse(JSON.stringify(payload), input).get('en')?.candidates;
    expect(candidates?.filter((candidate) => candidate.best)).toHaveLength(1);
  });

  it('Groq가 부가 스타일과 후보 설명을 생략해도 번역 문구를 사용한다', () => {
    const compactResponse = JSON.stringify({
      translations: [{
        language: 'en',
        candidates: ['Study mode', 'Focus time'],
      }],
    });

    const result = parseTranslationResponse(compactResponse, input).get('en');
    expect(result?.candidates.map((candidate) => candidate.text)).toEqual(['Study mode', 'Focus time']);
    expect(result?.candidates.filter((candidate) => candidate.best)).toHaveLength(1);
    expect(result?.recommendedStyle.alignment).toBe('center');
  });

  it('code fence, 언어 별칭, 후보 별칭이 섞여도 결과를 정규화한다', () => {
    const irregularResponse = `\`\`\`json
      {"results":[{"targetLanguage":"en-US","options":[{"translation":"Study mode"},{"value":"Focus time"}],"style":{"fontCategory":"comic"}}]}
      \`\`\``;

    const result = parseTranslationResponse(irregularResponse, input).get('en');
    expect(result?.candidates.map((candidate) => candidate.text)).toEqual(['Study mode', 'Focus time']);
    expect(result?.recommendedStyle.fontCategory).toBe('comic');
  });
});
