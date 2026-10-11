import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  EvaluationBudget,
  BudgetExceeded,
  type ModelPrice,
} from '../../benchmarks/translation/budget.js';
import { CAPTIONS } from '../../benchmarks/translation/dataset.js';
import { splitCaptions } from '../../benchmarks/translation/split.js';
import {
  bootstrapCI,
  compareHoldout,
  summarizeRows,
  type EvaluationRow,
} from '../../benchmarks/translation/statistics.js';
import { parseJudgment, judgeCaption } from '../../benchmarks/translation/judge.js';
import {
  buildChatRequest,
  translationRequestConfig,
  groqMessages,
} from '../../src/translation/translation-request.js';
import { buildTranslationMessages } from '../../src/translation/translation-prompt.js';
const mockChat = vi.hoisted(() => vi.fn());
vi.mock('../../benchmarks/translation/llm.js', () => ({ chat: mockChat }));
const temporary: string[] = [];
afterEach(() => {
  temporary.forEach((directory) => rmSync(directory, { recursive: true, force: true }));
  temporary.length = 0;
  vi.clearAllMocks();
});
const price: ModelPrice = {
  provider: 'openai',
  model: 'test',
  inputPerMillion: 1,
  outputPerMillion: 1,
  source: 'https://openai.com/api/pricing/',
  verifiedAt: new Date().toISOString(),
};
const file = () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'translation-budget-'));
  temporary.push(directory);
  return path.join(directory, 'ledger.json');
};
const score = { fidelity: 4, naturalness: 4, tone: 4, sticker: 4, problem: '' };
const row = (id: string, n = 4): EvaluationRow => ({
  id,
  category: 'test',
  ok: true,
  invalid: false,
  needsReview: false,
  ms: 1,
  completionTokens: 1,
  langs: {
    en: { texts: ['Thanks'], best: 0 },
    ja: { texts: ['ありがとう'], best: 0 },
    zh: { texts: ['谢谢'], best: 0 },
  },
  judged: Object.fromEntries(
    ['en', 'ja', 'zh'].map((lang) => [
      lang,
      [{ ...score, fidelity: n, naturalness: n, tone: n, sticker: n }],
    ]),
  ) as EvaluationRow['judged'],
});
describe('evaluation budget', () => {
  it('reserves before sending and retains unknown charges across restart', () => {
    const location = file();
    const first = new EvaluationBudget(location, 0.01, [price]);
    const account = first.reserve('openai', { model: 'test', max_completion_tokens: 100 });
    const amount = first.totalUsd;
    account(undefined);
    expect(first.summary().unresolvedRequests).toBe(1);
    first.close();
    const resumed = new EvaluationBudget(location, 0.01, [price]);
    expect(resumed.totalUsd).toBe(amount);
    expect(() =>
      resumed.reserve('openai', { model: 'test', max_completion_tokens: 10000 }),
    ).toThrow(BudgetExceeded);
    expect(resumed.summary().requests).toBe(1);
    resumed.close();
  });
  it('reconciles usage once and refuses concurrent ledger writers', () => {
    const location = file();
    const budget = new EvaluationBudget(location, 10, [price]);
    const account = budget.reserve('openai', { model: 'test', max_completion_tokens: 100 });
    expect(() => new EvaluationBudget(location, 10, [price])).toThrow('locked');
    account({ prompt_tokens: 100, completion_tokens: 50 });
    account({ prompt_tokens: 0, completion_tokens: 0 });
    expect(budget.totalUsd).toBe(0.00015);
    expect(JSON.parse(readFileSync(location, 'utf8')).reservations).toHaveLength(1);
    budget.close();
  });
  it('rejects stale prices, unknown models and changed caps on resume', () => {
    expect(
      () => new EvaluationBudget(file(), 10, [{ ...price, verifiedAt: '2020-01-01' }]),
    ).toThrow('Prices');
    const location = file();
    const budget = new EvaluationBudget(location, 1, [price]);
    expect(() => budget.reserve('openai', { model: 'other', max_completion_tokens: 1 })).toThrow(
      'Missing verified price',
    );
    budget.close();
    expect(() => new EvaluationBudget(location, 10, [price])).toThrow('Resume');
  });
});
describe('dataset, blind judge and acceptance gate', () => {
  it('uses a deterministic disjoint 70/35 split covering all categories', () => {
    const first = splitCaptions();
    expect(first).toEqual(splitCaptions());
    expect(first.dev).toHaveLength(70);
    expect(first.holdout).toHaveLength(35);
    expect(new Set([...first.dev, ...first.holdout].map((row) => row.id)).size).toBe(105);
    expect(new Set(first.holdout.map((row) => row.category)).size).toBe(12);
    expect(new Set(CAPTIONS.map((row) => row.ko)).size).toBe(105);
  });
  it('rejects missing, out-of-range and fractional scores', () => {
    const valid = { en: [score], ja: [score], zh: [score] };
    expect(parseJudgment(JSON.stringify(valid), { en: 1, ja: 1, zh: 1 })).toEqual(valid);
    for (const invalid of [
      { en: [score], ja: [score] },
      { ...valid, en: [] },
      { ...valid, en: [{ ...score, fidelity: 4.5 }] },
      { ...valid, en: [{ ...score, fidelity: 6 }] },
    ])
      expect(() => parseJudgment(JSON.stringify(invalid), { en: 1, ja: 1, zh: 1 })).toThrow();
  });
  it('restores candidate order after blind judging without exposing BEST or provider', async () => {
    mockChat.mockImplementation(async (messages) => {
      const payload = JSON.parse(messages[1].content);
      expect(payload).not.toHaveProperty('provider');
      expect(payload).not.toHaveProperty('best');
      return {
        content: JSON.stringify(
          Object.fromEntries(
            ['en', 'ja', 'zh'].map((lang) => [
              lang,
              payload.candidates[lang].map((text: string) => ({
                ...score,
                fidelity: Number(text),
              })),
            ]),
          ),
        ),
      };
    });
    const judged = await judgeCaption(CAPTIONS[0], {
      en: ['1', '2', '3'],
      ja: ['1', '2', '3'],
      zh: ['1', '2', '3'],
    });
    expect(judged.en.map((score) => score.fidelity)).toEqual([1, 2, 3]);
  });
  it('separates judge failures from generation failures and uses null for missing scores', () => {
    expect(summarizeRows([{ ...row('a'), judged: undefined, judgeError: 'failed' }])).toMatchObject(
      {
        generationFailures: 0,
        judgeFailures: 1,
        best: { overall: null },
        measurementStatus: 'unmeasured',
      },
    );
  });
  it('requires a complete paired holdout and blocks quality or validation regressions', () => {
    expect(compareHoldout([row('a')], [row('a', 5)], ['a']).eligible).toBe(true);
    expect(compareHoldout([row('a')], [row('a', 5)], ['a', 'b']).reasons).toContain(
      'incomplete_holdout',
    );
    expect(
      compareHoldout([row('a')], [{ ...row('a', 5), invalid: true }], ['a']).reasons,
    ).toContain('validation_failure_increased');
    expect(compareHoldout([row('a')], [row('a')], ['a']).eligible).toBe(false);
    const worse = row('a', 5);
    worse.judged!.en[0].fidelity = 1;
    worse.judged!.ja[0].fidelity = 1;
    expect(compareHoldout([row('a')], [worse], ['a']).reasons).toContain('fidelity_declined');
  });
  it('bootstraps by caption reproducibly', () => {
    expect(bootstrapCI([1, 2, 3])).toEqual(bootstrapCI([1, 2, 3]));
    expect(bootstrapCI([4, 4, 4])).toEqual([4, 4]);
  });
  it('shares production requests while keeping experimental prompts separate', () => {
    const config = translationRequestConfig('groq', { GROQ_MODEL: 'custom' });
    const input = {
      sourceText: '오늘도\n무사히 출근',
      sourceLanguage: 'ko',
      targetLanguages: ['en'],
      context: { tone: 'funny', audience: 'teen', translationStyle: 'trendy' },
      constraintsByLanguage: { en: { maxCharacters: 18 } },
    } as Parameters<typeof buildTranslationMessages>[0];
    expect(buildChatRequest(config, groqMessages(input))).toMatchObject({
      model: 'custom',
      temperature: 0.4,
      reasoning_effort: 'none',
      max_tokens: 1500,
    });
    expect(groqMessages(input)).toEqual(buildTranslationMessages(input));
    expect(groqMessages(input, 'groq-v3-meaning')).not.toEqual(buildTranslationMessages(input));
  });
});
