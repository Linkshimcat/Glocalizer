import fs from 'node:fs';
import path from 'node:path';
import type { LocalizationBatchInput } from '../../src/ai/localization/localization-provider.types.js';
import { validateTranslationResult } from '../../src/ai/localization/localization-validator.js';
import { parseTranslationResponse } from '../../src/translation/translation-response.parser.js';
import { CAPTIONS, type Caption } from './dataset.js';
import { judgeCaption, LANGS, MAX_CHARS, overall, type JudgedCaption, type Lang } from './judge.js';
import { chat, mapLimit } from './llm.js';
import { VARIANTS, type Variant } from './variants.js';

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : fallback; };
const variantNames = flag('variants', 'baseline').split(',');
const limit = Number(flag('limit', String(CAPTIONS.length)));
const genConcurrency = Number(flag('gen-concurrency', '2'));
const judgeModel = flag('judge-model', 'gpt-5.6');
const stride = Number(flag('stride', '1'));
const outDir = flag('out', path.join(import.meta.dirname, 'results'));
fs.mkdirSync(outDir, { recursive: true });

interface Row {
  id: string;
  ko: string;
  category: string;
  ok: boolean;
  error?: string;
  ms: number;
  completionTokens: number;
  needsReview: boolean;
  invalid: boolean;
  /** 언어별 후보 문구와 best 인덱스. */
  langs?: Record<Lang, { texts: string[]; best: number }>;
  judged?: JudgedCaption;
}

function buildInput(caption: Caption): LocalizationBatchInput {
  return {
    sourceText: caption.ko,
    sourceLanguage: 'ko',
    targetLanguages: [...LANGS],
    // 프로덕션 기본 옵션(createProject)과 동일
    context: { contentType: 'emoticon', tone: 'funny', audience: 'teen', translationStyle: 'trendy', siblingCaptions: [] },
    constraintsByLanguage: Object.fromEntries(LANGS.map((lang) => [lang, { maxCharacters: MAX_CHARS[lang], textBoxWidth: 200, textBoxHeight: 60 }])) as LocalizationBatchInput['constraintsByLanguage'],
  };
}

const cacheDir = path.join(import.meta.dirname, 'results', 'cache');
fs.mkdirSync(cacheDir, { recursive: true });
const progress = (label: string, done: number, total: number, started: number) => {
  if (done % 5 === 0 || done === total) console.log(`  ${label} ${done}/${total}  ${Math.round((Date.now() - started) / 1000)}s`);
};

async function generate(variant: Variant, caption: Caption): Promise<Row> {
  // 같은 변형·캡션은 다시 호출하지 않는다(중단 후 재개, 심사만 다시 돌리기 위함).
  const cacheFile = path.join(cacheDir, `${variant.name}--${caption.id}.json`);
  if (fs.existsSync(cacheFile)) return JSON.parse(fs.readFileSync(cacheFile, 'utf8')) as Row;
  const row = await generateUncached(variant, caption);
  if (row.ok) fs.writeFileSync(cacheFile, JSON.stringify(row));
  return row;
}

async function generateUncached(variant: Variant, caption: Caption): Promise<Row> {
  const input = buildInput(caption);
  const row: Row = { id: caption.id, ko: caption.ko, category: caption.category, ok: false, ms: 0, completionTokens: 0, needsReview: false, invalid: false };
  try {
    const result = await chat(variant.messages(input), variant.options);
    row.ms = result.ms; row.completionTokens = result.completionTokens;
    const parsed = parseTranslationResponse(result.content, input);
    row.langs = {} as Row['langs'];
    for (const lang of LANGS) {
      const translation = parsed.get(lang)!;
      const validation = validateTranslationResult(translation);
      if (!validation.valid) row.invalid = true;
      if (validation.needsReview) row.needsReview = true;
      row.langs![lang] = { texts: translation.candidates.map((candidate) => candidate.text), best: Math.max(0, translation.candidates.findIndex((candidate) => candidate.best)) };
    }
    row.ok = true;
  } catch (error) {
    row.error = error instanceof Error ? error.message : String(error);
  }
  return row;
}

const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
const stderr = (values: number[]) => { if (values.length < 2) return 0; const m = mean(values); return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1) / values.length); };
const pct = (values: number[], p: number) => { const s = [...values].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };

function summarize(name: string, rows: Row[]): Record<string, unknown> {
  const ok = rows.filter((row) => row.ok && row.judged);
  const bestScores = ok.flatMap((row) => LANGS.map((lang) => row.judged![lang][row.langs![lang].best]));
  const allScores = ok.flatMap((row) => LANGS.flatMap((lang) => row.judged![lang]));
  const oracle = ok.flatMap((row) => LANGS.map((lang) => Math.max(...row.judged![lang].map(overall))));
  const by = (key: 'fidelity' | 'naturalness' | 'tone' | 'sticker') => mean(bestScores.map((score) => score[key]));
  const perLang = Object.fromEntries(LANGS.map((lang) => [lang, mean(ok.map((row) => overall(row.judged![lang][row.langs![lang].best])))]));
  const categories = [...new Set(rows.map((row) => row.category))];
  const perCategory = Object.fromEntries(categories.map((category) => [category, mean(ok.filter((row) => row.category === category).flatMap((row) => LANGS.map((lang) => overall(row.judged![lang][row.langs![lang].best]))))]));
  const bestOverall = bestScores.map(overall);
  return {
    variant: name,
    n: rows.length,
    failed: rows.filter((row) => !row.ok).length,
    invalidRate: mean(rows.map((row) => (row.invalid ? 1 : 0))),
    needsReviewRate: mean(rows.map((row) => (row.needsReview ? 1 : 0))),
    best: { overall: mean(bestOverall), se: stderr(bestOverall), fidelity: by('fidelity'), naturalness: by('naturalness'), tone: by('tone'), sticker: by('sticker') },
    allCandidatesOverall: mean(allScores.map(overall)),
    oracleBestOf3: mean(oracle),
    perLang,
    perCategory,
    latencyMs: { p50: pct(rows.map((row) => row.ms), 0.5), p95: pct(rows.map((row) => row.ms), 0.95) },
    completionTokensMean: mean(rows.map((row) => row.completionTokens)),
  };
}

// stride N: N개마다 하나씩 뽑아 카테고리를 고르게 유지한 개발 세트로 빠르게 비교한다.
const captions = CAPTIONS.filter((_, index) => index % stride === 0).slice(0, limit);
for (const name of variantNames) {
  const variant = VARIANTS[name];
  if (!variant) throw new Error(`unknown variant ${name}`);
  console.log(`\n== ${name}: ${variant.description}`);
  let generated = 0; const genStarted = Date.now();
  const rows = await mapLimit(captions, genConcurrency, async (caption) => { const row = await generate(variant, caption); generated += 1; progress('generate', generated, captions.length, genStarted); return row; });
  let judgedCount = 0; const judgeStarted = Date.now();
  const judgedRows = await mapLimit(rows, 4, async (row) => {
    judgedCount += 1; progress('judge', judgedCount, rows.length, judgeStarted);
    if (!row.ok) return row;
    const caption = captions.find((item) => item.id === row.id)!;
    try {
      row.judged = await judgeCaption(caption, Object.fromEntries(LANGS.map((lang) => [lang, row.langs![lang].texts])) as Record<Lang, string[]>, judgeModel);
    } catch (error) {
      row.ok = false; row.error = `judge: ${error instanceof Error ? error.message : String(error)}`;
    }
    return row;
  });
  fs.writeFileSync(path.join(outDir, `${name}${judgeModel === 'gpt-5.6' ? '' : `@${judgeModel}`}.json`), JSON.stringify({ variant: name, description: variant.description, judgeModel, rows: judgedRows }, null, 1));
  const s = summarize(name, judgedRows) as any;
  const f = (n: number) => n.toFixed(2);
  console.log(`n=${s.n} failed=${s.failed} invalid=${(s.invalidRate * 100).toFixed(0)}% needsReview=${(s.needsReviewRate * 100).toFixed(0)}%  latency p50=${s.latencyMs.p50}ms p95=${s.latencyMs.p95}ms`);
  console.log(`BEST overall ${f(s.best.overall)} ±${f(s.best.se)} | fidelity ${f(s.best.fidelity)} natural ${f(s.best.naturalness)} tone ${f(s.best.tone)} sticker ${f(s.best.sticker)}`);
  console.log(`all-candidates ${f(s.allCandidatesOverall)} | oracle best-of-3 ${f(s.oracleBestOf3)} | en ${f(s.perLang.en)} ja ${f(s.perLang.ja)} zh ${f(s.perLang.zh)}`);
  console.log('by category:', Object.entries(s.perCategory).map(([k, v]) => `${k}=${f(v as number)}`).join('  '));
}
