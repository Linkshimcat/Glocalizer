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

  for (const name of ['stripes', 'dots-dense', 'checker', 'neon-glow']) {
    it(`${name}(어려운 유형): 훼손 없이 처리하거나 수동/폴백으로 넘긴다`, async () => {
      const scenario = SCENARIOS.find((item) => item.name === name)!;
      const summary = summarize(name, true, await runScenario(await renderScenario(scenario), jitters));
      expect(summary.maxCollateralPx).toBeLessThanOrEqual(30);
    }, 60_000);
  }

  // 배경 평면 모델(background-model.ts) 도입 이후 자동 복원이 가능해진 유형은 회귀를 막기 위해 통과를 요구한다.
  for (const name of ['gradient-strong', 'noisy-photo']) {
    it(`${name}(어려운 유형): 배경 모델로 자동 복원되고 박스 흔들림에도 안정적이다`, async () => {
      const scenario = SCENARIOS.find((item) => item.name === name)!;
      const summary = summarize(name, true, await runScenario(await renderScenario(scenario), jitters));
      expect(summary.passRate).toBe(1);
      expect(summary.stability).toBe(1);
      expect(summary.maxCollateralPx).toBeLessThanOrEqual(30);
    }, 60_000);
  }

  it('dots-sparse(어려운 유형): 박스가 흔들려도 판정이 뒤집히지 않고 항상 수동/폴백으로 넘긴다', async () => {
    const scenario = SCENARIOS.find((item) => item.name === 'dots-sparse')!;
    // 전체 JITTERS를 써야 이전에 판정이 갈리던 흔들림 조합(2026-09-22 실측)이 포함된다.
    const summary = summarize('dots-sparse', true, await runScenario(await renderScenario(scenario), JITTERS));
    expect(summary.stability).toBe(1);
    expect(summary.maxCollateralPx).toBeLessThanOrEqual(30);
  }, 60_000);
});
