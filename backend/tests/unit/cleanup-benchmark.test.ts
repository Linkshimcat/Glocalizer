import { describe, expect, it } from 'vitest';
import { renderScenario, runScenario, summarize, JITTERS } from '../../benchmarks/cleanup/benchmark.js';
import { SCENARIOS } from '../../benchmarks/cleanup/scenarios.js';

/**
 * 합성 벤치마크 회귀 가드(전체 표는 `npm run benchmark:cleanup`). 사용자 이미지를 쓰지 않고 정답 마스크가 있는
 * 합성 이미지로, 잘 되는 유형은 계속 되고 어려운 유형은 "훼손 없이" 실패하는지 지킨다.
 */
const jitters = JITTERS.slice(0, 4);

describe('cleanup benchmark', () => {
  for (const scenario of SCENARIOS.filter((item) => !item.hard)) {
    it(`${scenario.name}: 글자를 지우고 주변은 건드리지 않으며 박스 흔들림에도 안정적이다`, async () => {
      const summary = summarize(scenario.name, false, await runScenario(await renderScenario(scenario), jitters));
      expect(summary.passRate).toBe(1);
      expect(summary.maxCollateralPx).toBeLessThanOrEqual(30);
      expect(summary.stability).toBe(1);
    }, 60_000);
  }

  for (const name of ['stripes', 'dots-dense', 'checker', 'gradient-strong', 'noisy-photo', 'neon-glow']) {
    it(`${name}(어려운 유형): 훼손 없이 처리하거나 수동/폴백으로 넘긴다`, async () => {
      const scenario = SCENARIOS.find((item) => item.name === name)!;
      const summary = summarize(name, true, await runScenario(await renderScenario(scenario), jitters));
      expect(summary.maxCollateralPx).toBeLessThanOrEqual(30);
    }, 60_000);
  }
});
