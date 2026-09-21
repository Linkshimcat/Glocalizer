import fs from 'node:fs';
import { renderScenario, runScenario, summarize } from './benchmark.js';
import { SCENARIOS } from './scenarios.js';

const summaries = [];
for (const scenario of SCENARIOS) {
  const rendered = await renderScenario(scenario);
  summaries.push(summarize(scenario.name, Boolean(scenario.hard), await runScenario(rendered)));
}
const pct = (value: number) => `${Math.round(value * 100)}%`.padStart(4);
console.log('scenario'.padEnd(30), 'pass', 'resid', 'stab', 'collat', 'outcomes');
for (const s of summaries) {
  console.log(`${s.name.padEnd(30)} ${pct(s.passRate)} ${pct(s.meanResidual)} ${pct(s.stability)} ${String(s.maxCollateralPx).padStart(6)}  ${JSON.stringify(s.outcomes)}${s.hard ? '  (hard)' : ''}`);
}
const easy = summaries.filter((s) => !s.hard);
const hard = summaries.filter((s) => s.hard);
const avg = (list: typeof summaries, key: 'passRate' | 'stability') => list.reduce((sum, s) => sum + s[key], 0) / Math.max(1, list.length);
console.log(`\neasy pass ${pct(avg(easy, 'passRate'))}  stability ${pct(avg(easy, 'stability'))}   |   hard pass ${pct(avg(hard, 'passRate'))}  stability ${pct(avg(hard, 'stability'))}`);
const out = process.argv[2];
if (out) fs.writeFileSync(out, JSON.stringify(summaries, null, 2));
