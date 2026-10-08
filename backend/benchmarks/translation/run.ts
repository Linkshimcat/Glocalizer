import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import dotenv from 'dotenv';
import { safeTranslationFailure } from '../../src/translation/translation-execution.js';
import type { LocalizationBatchInput } from '../../src/ai/localization/localization-provider.types.js';
import { validateTranslationResult } from '../../src/ai/localization/localization-validator.js';
import { CAPTIONS, type Caption } from './dataset.js';
import {
  judgeCaption,
  judgeSignature,
  parseJudgment,
  JUDGE_VERSION,
  LANGS,
  MAX_CHARS,
  type Lang,
} from './judge.js';
import { generateTranslation, mapLimit, setEvaluationBudget, configFor } from './llm.js';
import { EvaluationBudget, BudgetExceeded, type ModelPrice } from './budget.js';
import { DATASET_HASH, splitCaptions } from './split.js';
import { summarizeRows, compareHoldout, type EvaluationRow } from './statistics.js';
import type { Variant } from './variants.js';

const args = process.argv.slice(2);
const valueFlags = new Set([
  '--env-file',
  '--variants',
  '--limit',
  '--stride',
  '--gen-concurrency',
  '--judge-model',
  '--split',
  '--out',
  '--ledger',
  '--budget-usd',
  '--selection',
  '--prices',
]);
for (let i = 0; i < args.length; i++) {
  if (['--dry-run', '--select'].includes(args[i])) continue;
  if (!valueFlags.has(args[i]) || !args[i + 1] || args[i + 1].startsWith('--'))
    throw new Error('Unknown or incomplete evaluation option');
  i++;
}
const flag = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  if (i >= 0 && (!args[i + 1] || args[i + 1].startsWith('--')))
    throw new Error(`Missing --${name} value`);
  return i >= 0 ? args[i + 1] : fallback;
};
dotenv.config({ path: flag('env-file', '.env'), quiet: true });
// Load variants only after dotenv so current-* reflects the actual model configuration.
const { VARIANTS } = await import('./variants.js');
const variantNames = flag('variants', 'current-groq').split(',');
const limit = Number(flag('limit', String(CAPTIONS.length)));
const stride = Number(flag('stride', '1'));
const concurrency = Number(flag('gen-concurrency', '1'));
const judgeModel = flag('judge-model', 'gpt-5.6');
const split = flag('split', 'all');
const outDir = path.resolve(flag('out', path.join(import.meta.dirname, 'results')));
const ledgerPath = path.resolve(
  flag('ledger', path.join(import.meta.dirname, 'results', 'budget.json')),
);
const parts = splitCaptions();
if (![limit, stride, concurrency].every((value) => Number.isInteger(value) && value > 0))
  throw new Error('limit, stride and concurrency must be positive integers');
if (!['all', 'dev', 'holdout'].includes(split))
  throw new Error('split must be all, dev or holdout');
if (new Set(variantNames).size !== variantNames.length) throw new Error('Duplicate variants');
for (const name of variantNames) if (!VARIANTS[name]) throw new Error(`Unknown variant: ${name}`);
const captions = (split === 'all' ? CAPTIONS : split === 'dev' ? parts.dev : parts.holdout)
  .filter((_, i) => i % stride === 0)
  .slice(0, limit);
const budgetUsd = Number(flag('budget-usd', '10'));
if (!Number.isFinite(budgetUsd) || budgetUsd <= 0 || budgetUsd > 10)
  throw new Error('budget-usd must be >0 and <=10');
if (args.includes('--dry-run')) {
  console.log(
    JSON.stringify(
      {
        executionMode: 'production-provider',
        datasetHash: DATASET_HASH,
        variants: variantNames.map((name) => ({
          name,
          model: VARIANTS[name].options.model,
          provider: VARIANTS[name].options.provider,
        })),
        split,
        captions: captions.length,
        languages: LANGS,
        categories: Object.fromEntries(
          [...new Set(captions.map((row) => row.category))].map((category) => [
            category,
            captions.filter((row) => row.category === category).length,
          ]),
        ),
        partitionSizes: { dev: parts.dev.length, holdout: parts.holdout.length },
        idsUnique: new Set(CAPTIONS.map((row) => row.id)).size === CAPTIONS.length,
        textsUnique: new Set(CAPTIONS.map((row) => row.ko)).size === CAPTIONS.length,
        budgetUsd,
        keysConfigured: { groq: !!process.env.GROQ_API_KEY, openai: !!process.env.OPENAI_API_KEY },
        experimentalHoldoutRequiresFrozenSelection: true,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

function buildInput(caption: Caption): LocalizationBatchInput {
  return {
    sourceText: caption.ko,
    sourceLanguage: 'ko',
    targetLanguages: [...LANGS],
    context: {
      contentType: 'emoticon',
      tone: 'funny',
      audience: 'teen',
      translationStyle: 'trendy',
      siblingCaptions: [],
    },
    constraintsByLanguage: Object.fromEntries(
      LANGS.map((lang) => [
        lang,
        { maxCharacters: MAX_CHARS[lang], textBoxWidth: 200, textBoxHeight: 60 },
      ]),
    ) as LocalizationBatchInput['constraintsByLanguage'],
  };
}
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const implementationHash = hash(
  ['translation-http.ts', 'translation-request.ts', 'translation-response.parser.ts'].map((file) =>
    fs.readFileSync(path.join(import.meta.dirname, '../../src/translation', file), 'utf8'),
  ),
);
const variantSignature = (variant: Variant) =>
  hash([
    implementationHash,
    DATASET_HASH,
    variant.options,
    configFor(variant.options).baseUrl,
    CAPTIONS.map((caption) => variant.messages(buildInput(caption))),
    'provider-v1',
    process.env.TRANSLATION_PRIMARY_BUDGET_MS ?? 30000,
    process.env.TRANSLATION_OPERATION_BUDGET_MS ?? 90000,
    configFor(variant.options).timeoutMs,
    configFor(variant.options).attempts,
  ]);
const experimental = variantNames.filter((name) => name.startsWith('groq-v3-'));
if (experimental.length && split !== 'dev') {
  const selectionFile = flag('selection', '');
  if (!selectionFile)
    throw new Error(
      'Experimental all/holdout runs require --selection from a development-only run',
    );
  const selection = JSON.parse(fs.readFileSync(selectionFile, 'utf8'));
  if (
    experimental.length !== 1 ||
    selection.variant !== experimental[0] ||
    selection.datasetHash !== DATASET_HASH ||
    selection.signature !== variantSignature(VARIANTS[experimental[0]]) ||
    selection.judgeModel !== judgeModel ||
    selection.judgeVersion !== JUDGE_VERSION ||
    selection.selectedFrom !== 'dev'
  )
    throw new Error(
      'Selection does not match the frozen development winner, dataset, prompt or judge',
    );
}
for (const name of variantNames)
  if (!process.env[VARIANTS[name].options.provider === 'groq' ? 'GROQ_API_KEY' : 'OPENAI_API_KEY'])
    throw new Error(`Missing ${VARIANTS[name].options.provider} API key; no calls made`);
if (!process.env.OPENAI_API_KEY) throw new Error('Missing OpenAI judge key; no calls made');
const pricesPath = flag('prices', '');
if (!pricesPath)
  throw new Error('--prices is required: use an official, recently verified model price snapshot');
const prices = JSON.parse(fs.readFileSync(pricesPath, 'utf8')) as ModelPrice[];
const budget = new EvaluationBudget(ledgerPath, budgetUsd, prices);
setEvaluationBudget(budget);
const cacheDir = path.join(outDir, 'cache');
fs.mkdirSync(cacheDir, { recursive: true });
interface Row extends EvaluationRow {
  ko: string;
  error?: string;
  promptTokens?: number;
  attempts?: number;
  queueWaitMs?: number;
  cooldownWaitMs?: number;
  validationReasons?: string[];
}
const generatedReports = new Map<string, Row[]>();
let budgetExhausted = false;
try {
  budget.assertModels([
    ...variantNames.map((name) => VARIANTS[name].options),
    { provider: 'openai', model: judgeModel },
  ]);
  for (const name of variantNames) {
    const variant = VARIANTS[name];
    const signature = variantSignature(variant);
    // Judge each caption immediately so a budget stop still leaves scored samples.
    const judgeRow = async (row: Row) => {
      if (!row.ok) return;
      const caption = captions.find((caption) => caption.id === row.id)!;
      const candidates = Object.fromEntries(
        LANGS.map((lang) => [lang, row.langs![lang].texts]),
      ) as Record<Lang, string[]>;
      const judgeCache = path.join(
        cacheDir,
        `judge--${judgeSignature(caption, candidates, judgeModel)}.json`,
      );
      try {
        if (fs.existsSync(judgeCache))
          row.judged = parseJudgment(
            fs.readFileSync(judgeCache, 'utf8'),
            Object.fromEntries(LANGS.map((lang) => [lang, candidates[lang].length])) as Record<
              Lang,
              number
            >,
          );
        else if (budgetExhausted) row.judgeError = 'budget_not_evaluated';
        else {
          row.judged = await judgeCaption(caption, candidates, judgeModel);
          fs.writeFileSync(judgeCache, JSON.stringify(row.judged));
        }
      } catch (error) {
        row.judgeError = error instanceof Error ? error.message : 'judge_failed';
        if (error instanceof BudgetExceeded) {
          budgetExhausted = true;
          row.judgeError = 'budget_not_evaluated';
        }
      }
    };
    const rows = await mapLimit(captions, concurrency, async (caption) => {
      const input = buildInput(caption);
      const cacheFile = path.join(cacheDir, `generation--${hash([signature, caption])}.json`);
      if (fs.existsSync(cacheFile)) {
        const row = { ...(JSON.parse(fs.readFileSync(cacheFile, 'utf8')) as Row), cacheHit: true };
        await judgeRow(row);
        return row;
      }
      const row: Row = {
        id: caption.id,
        ko: caption.ko,
        category: caption.category,
        ok: false,
        ms: 0,
        completionTokens: 0,
        needsReview: false,
        invalid: false,
      };
      if (budgetExhausted) {
        row.error = 'budget_not_evaluated';
        row.notEvaluated = true;
        return row;
      }
      const started = Date.now();
      try {
        const result = await generateTranslation(input, variant.messages(input), variant.options);
        Object.assign(row, {
          ms: result.ms,
          completionTokens: result.completionTokens,
          promptTokens: result.promptTokens,
          attempts: result.attempts,
          queueWaitMs: result.queueWaitMs,
          cooldownWaitMs: result.cooldownWaitMs,
        });
        row.langs = {} as Row['langs'];
        row.validationReasons = [];
        for (const lang of LANGS) {
          const translation = result.parsed.get(lang)!;
          const validation = validateTranslationResult(translation);
          row.invalid ||= !validation.valid;
          row.needsReview ||= validation.needsReview;
          row.validationReasons.push(...validation.reasons);
          row.langs![lang] = {
            texts: translation.candidates.map((candidate) => candidate.text),
            best: translation.candidates.findIndex((candidate) => candidate.best),
          };
        }
        row.ok = true;
        fs.writeFileSync(cacheFile, JSON.stringify(row));
      } catch (error) {
        row.ms = Date.now() - started;
        row.error = error instanceof Error ? error.message : 'generation_failed';
        row.generationFailureReason = safeTranslationFailure(error).failureReason;
        if (error instanceof BudgetExceeded) {
          budgetExhausted = true;
          row.error = 'budget_not_evaluated';
          row.notEvaluated = true;
        }
      }
      await judgeRow(row);
      return row;
    });
    generatedReports.set(name, rows);
    const summaries = {
      all: summarizeRows(rows),
      dev: summarizeRows(rows.filter((row) => parts.dev.some((caption) => caption.id === row.id))),
      holdout: summarizeRows(
        rows.filter((row) => parts.holdout.some((caption) => caption.id === row.id)),
      ),
    };
    const report = {
      variant: name,
      description: variant.description,
      signature,
      datasetHash: DATASET_HASH,
      judgeModel,
      judgeVersion: JUDGE_VERSION,
      split,
      executionMode: 'production-provider',
      createdAt: new Date().toISOString(),
      budget: budget.summary(),
      budgetExhausted,
      summaries,
      rows,
    };
    const file = path.join(outDir, `${name}--${split}--${signature.slice(0, 12)}.json`);
    fs.writeFileSync(file, JSON.stringify(report, null, 2));
    console.log(
      JSON.stringify({ variant: name, file, ...summaries.all, budget: budget.summary() }, null, 2),
    );
  }
  if (!budgetExhausted && split === 'dev' && experimental.length && args.includes('--select')) {
    const baseline = generatedReports.get('current-groq');
    if (!baseline || baseline.some((row) => !row.ok || !row.judged))
      throw new Error('Selection needs a fully scored current-groq development comparison');
    const ranked = experimental
      .map((name) => {
        const rows = generatedReports.get(name)!;
        return {
          name,
          complete: rows.length === captions.length && rows.every((row) => row.ok && row.judged),
          score: summarizeRows(rows).best.overall,
        };
      })
      .filter((row) => row.complete && row.score !== null)
      .sort((a, b) => b.score! - a.score! || a.name.localeCompare(b.name));
    if (ranked.length !== experimental.length)
      throw new Error('Incomplete development comparison; no winner frozen');
    const winner = ranked[0].name;
    fs.writeFileSync(
      path.join(outDir, 'selection.json'),
      JSON.stringify(
        {
          variant: winner,
          signature: variantSignature(VARIANTS[winner]),
          datasetHash: DATASET_HASH,
          judgeModel,
          judgeVersion: JUDGE_VERSION,
          selectedFrom: 'dev',
          evaluatedCaptions: captions.length,
          rankings: ranked,
        },
        null,
        2,
      ),
    );
  }
  if (split !== 'dev' && experimental.length && generatedReports.has('current-groq')) {
    const comparison = compareHoldout(
      generatedReports.get('current-groq')!,
      generatedReports.get(experimental[0])!,
      parts.holdout.map((caption) => caption.id),
    );
    fs.writeFileSync(
      path.join(outDir, 'holdout-comparison.json'),
      JSON.stringify(
        { variant: experimental[0], datasetHash: DATASET_HASH, judgeModel, ...comparison },
        null,
        2,
      ),
    );
    console.log(JSON.stringify({ holdoutComparison: comparison }, null, 2));
  }
} finally {
  budget.close();
}
if (budgetExhausted) process.exitCode = 2;
