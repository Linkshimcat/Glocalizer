import { LANGS, overall, type JudgedCaption, type Lang } from './judge.js';
export interface EvaluationRow {
  id: string;
  category: string;
  ok: boolean;
  invalid: boolean;
  needsReview: boolean;
  ms: number;
  completionTokens: number;
  langs?: Record<Lang, { texts: string[]; best: number }>;
  judged?: JudgedCaption;
  judgeError?: string;
  notEvaluated?: boolean;
  generationFailureReason?: string;
  cacheHit?: boolean;
}
export const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const best = (row: EvaluationRow, lang: Lang) => row.judged![lang][row.langs![lang].best];
const captionScore = (row: EvaluationRow) => mean(LANGS.map((lang) => overall(best(row, lang))))!;
const percentile = (values: number[], p: number) => {
  const s = [...values].sort((a, b) => a - b);
  return s.length ? s[Math.max(0, Math.ceil(p * s.length) - 1)] : null;
};
export function bootstrapCI(values: number[], seed = 42): [number, number] | null {
  if (values.length < 2) return null;
  const random = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const samples = Array.from({ length: 3000 }, () =>
    mean(
      Array.from({ length: values.length }, () => values[Math.floor(random() * values.length)]),
    )!,
  );
  return [percentile(samples, 0.025)!, percentile(samples, 0.975)!];
}
export function summarizeRows(rows: EvaluationRow[]) {
  const scored = rows.filter((row) => row.ok && row.judged && row.langs);
  const scores = scored.flatMap((row) => LANGS.map((lang) => best(row, lang)));
  const validGenerated = rows.filter((row) => row.ok);
  const captionScores = scored.map(captionScore);
  return {
    n: rows.length,
    generated: validGenerated.length,
    judged: scored.length,
    generationFailures: rows.filter((row) => !row.ok && !row.notEvaluated).length,
    generationNotEvaluated: rows.filter((row) => row.notEvaluated).length,
    judgeFailures: rows.filter((row) => row.judgeError && row.judgeError !== 'budget_not_evaluated')
      .length,
    judgeNotEvaluated: rows.filter((row) => row.judgeError === 'budget_not_evaluated').length,
    measurementStatus: !scored.length
      ? 'unmeasured'
      : scored.length === rows.length
        ? 'measured'
        : 'partial',
    invalidRate: mean(validGenerated.map((row) => Number(row.invalid))),
    needsReviewRate: mean(validGenerated.map((row) => Number(row.needsReview))),
    best: {
      overall: mean(captionScores),
      ci95: bootstrapCI(captionScores),
      ...Object.fromEntries(
        ['fidelity', 'naturalness', 'tone', 'sticker'].map((key) => [
          key,
          mean(scores.map((score) => score[key as keyof Omit<typeof score, 'problem'>])),
        ]),
      ),
    },
    severeMeaningErrorRate: mean(scores.map((score) => Number(score.fidelity <= 2))),
    validationFailures: rows.filter(
      (row) => row.invalid || row.generationFailureReason === 'validation',
    ).length,
    perLang: Object.fromEntries(
      LANGS.map((lang) => [
        lang,
        {
          n: scored.length,
          overall: mean(scored.map((row) => overall(best(row, lang)))),
          fidelity: mean(scored.map((row) => best(row, lang).fidelity)),
        },
      ]),
    ),
    perCategory: Object.fromEntries(
      [...new Set(rows.map((row) => row.category))].map((category) => {
        const group = scored.filter((row) => row.category === category);
        return [category, { n: group.length, overall: mean(group.map(captionScore)) }];
      }),
    ),
    latencyMs: {
      p50: percentile(
        validGenerated.map((row) => row.ms),
        0.5,
      ),
      p95: percentile(
        validGenerated.map((row) => row.ms),
        0.95,
      ),
    },
    latencySource: 'recorded_provider_runs',
    cachedGenerations: rows.filter((row) => row.cacheHit).length,
    completionTokensMean: mean(validGenerated.map((row) => row.completionTokens)),
  };
}
export function compareHoldout(
  baseline: EvaluationRow[],
  candidate: EvaluationRow[],
  ids: string[],
) {
  const lookup = (rows: EvaluationRow[]) =>
    new Map(rows.filter((row) => row.ok && row.judged && row.langs).map((row) => [row.id, row]));
  const b = lookup(baseline),
    c = lookup(candidate);
  const paired = ids
    .filter((id) => b.has(id) && c.has(id))
    .map((id) => [b.get(id)!, c.get(id)!] as const);
  const differences = paired.map(([before, after]) => captionScore(after) - captionScore(before));
  const improvement = mean(differences);
  const fidelityDelta = mean(
    paired.map(([before, after]) =>
      mean(LANGS.map((lang) => best(after, lang).fidelity - best(before, lang).fidelity))!,
    ),
  );
  const perLangDelta = Object.fromEntries(
    LANGS.map((lang) => [
      lang,
      mean(
        paired.map(([before, after]) => overall(best(after, lang)) - overall(best(before, lang))),
      ),
    ]),
  );
  const invalidDelta = mean(
    paired.map(([before, after]) => Number(after.invalid) - Number(before.invalid)),
  );
  const reasons: string[] = [];
  if (paired.length !== ids.length || !ids.length) reasons.push('incomplete_holdout');
  if (improvement === null || improvement < 0.1 - 1e-9) reasons.push('overall_gain_below_0.10');
  if (fidelityDelta === null || fidelityDelta < -1e-9) reasons.push('fidelity_declined');
  if (Object.values(perLangDelta).some((delta) => delta === null || delta < -0.1 - 1e-9))
    reasons.push('language_regression');
  if (invalidDelta === null || invalidDelta > 1e-9) reasons.push('validation_failure_increased');
  return {
    eligible: reasons.length === 0,
    reasons,
    pairedCaptions: paired.length,
    expectedCaptions: ids.length,
    overallDelta: improvement,
    ci95: bootstrapCI(differences),
    fidelityDelta,
    perLangDelta,
    invalidDelta,
  };
}
