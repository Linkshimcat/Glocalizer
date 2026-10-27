import dotenv from 'dotenv';
dotenv.config({ path: '.env', quiet: true });

import { assessCultureRisk } from '../../src/translation/culture-risk.service.js';
import type { TargetLanguage } from '../../src/types/localization.js';
import { CULTURE_RISK_FIXTURES } from './fixtures.js';

const LANGUAGES: TargetLanguage[] = ['en', 'ja', 'zh'];

interface Row {
  ko: string;
  language: TargetLanguage;
  expectedFlag: boolean;
  actualFlag: boolean;
  reason: string | null;
}

const rows: Row[] = [];
for (const fixture of CULTURE_RISK_FIXTURES) {
  for (const language of LANGUAGES) {
    try {
      // 실제 서비스에서는 번역 후보 3개를 넘기지만, 벤치마크에서는 원문 자체를 유일한
      // "후보"로 넘겨 판단 자체의 오탐·미탐만 본다(번역 품질과 분리해서 보기 위함).
      const findings = await assessCultureRisk(fixture.ko, [fixture.ko], language);
      rows.push({ ko: fixture.ko, language, expectedFlag: fixture.expectedFlag, actualFlag: findings.length > 0, reason: findings[0]?.reason ?? null });
    } catch (error) {
      console.error(`[실패] "${fixture.ko}" (${language}):`, error instanceof Error ? error.message : error);
    }
  }
}

const falsePositives = rows.filter(row => !row.expectedFlag && row.actualFlag);
const falseNegatives = rows.filter(row => row.expectedFlag && !row.actualFlag);
const agree = rows.length - falsePositives.length - falseNegatives.length;

console.log(`\n총 ${rows.length}건 — 일치 ${agree}건, 오탐(false positive) ${falsePositives.length}건, 미탐(false negative) ${falseNegatives.length}건\n`);

if (falsePositives.length) {
  console.log('── 오탐(안전한데 걸림) ──');
  for (const row of falsePositives) console.log(`  [${row.language}] "${row.ko}" → ${row.reason}`);
}
if (falseNegatives.length) {
  console.log('── 미탐(걸려야 하는데 안 걸림) ──');
  for (const row of falseNegatives) console.log(`  [${row.language}] "${row.ko}"`);
}

const out = process.argv[2];
if (out) {
  const fs = await import('node:fs');
  fs.writeFileSync(out, JSON.stringify(rows, null, 2));
}
