import { describe, expect, it } from 'vitest';
import { buildTranslationMessages } from '../../src/translation/translation-prompt.js';

const base = {
  sourceText: '배고파',
  sourceLanguage: 'ko' as const,
  targetLanguages: ['en' as const],
  context: { contentType: 'emoticon' as const, tone: 'cute' as const, audience: 'general' as const, translationStyle: 'natural' as const },
  constraintsByLanguage: { en: { maxCharacters: 18, textBoxWidth: 100, textBoxHeight: 30 } },
};

describe('buildTranslationMessages 페르소나', () => {
  it('페르소나가 없으면 지금과 같은 프롬프트다 (null도 없는 것과 같다)', () => {
    const without = buildTranslationMessages(base);
    expect(buildTranslationMessages({ ...base, context: { ...base.context, persona: null } })).toEqual(without);
    expect(without[1]!.content).not.toContain('persona');
  });

  it('페르소나가 있으면 사용자 메시지에 값을 따옴표로 감싸 넣고, 말투에만 영향을 주라고 적는다', () => {
    const messages = buildTranslationMessages({
      ...base,
      context: { ...base.context, persona: { personality: '수줍은 "고양이"', speechStyle: '말끝을 흐리는 반말', age: '10대', avoidExpressions: ['욕설', 'ㅗ'] } },
    });
    const user = messages[1]!.content;
    expect(user).toContain('"수줍은 \\"고양이\\""');
    expect(user).toContain('"말끝을 흐리는 반말"');
    expect(user).toContain('"10대"');
    expect(user).toContain('["욕설","ㅗ"]');
    expect(user).toMatch(/voice|word choice/i);
    expect(user).toMatch(/never (change|override) the meaning/i);
    // 의미·감정 보존 우선순위는 시스템 프롬프트에 그대로 남는다.
    expect(messages[0]).toEqual(buildTranslationMessages(base)[0]);
  });

  it('채운 항목만 넣는다', () => {
    const user = buildTranslationMessages({ ...base, context: { ...base.context, persona: { speechStyle: '존댓말' } } })[1]!.content;
    expect(user).toContain('"존댓말"');
    expect(user).not.toMatch(/personality=|age=|avoid/i);
  });
});
