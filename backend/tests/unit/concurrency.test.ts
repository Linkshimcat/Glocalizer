import { describe, expect, it } from 'vitest';
import { mapWithConcurrency } from '../../src/utils/concurrency.js';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('mapWithConcurrency', () => {
  it('결과 순서를 입력 순서와 동일하게 유지한다', async () => {
    const items = [30, 10, 20, 5];
    const results = await mapWithConcurrency(items, 2, async (ms) => {
      await delay(ms);
      return ms;
    });
    expect(results).toEqual(items);
  });

  it('동시에 concurrency개를 넘겨 실행하지 않는다', async () => {
    let active = 0;
    let maxActive = 0;

    await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await delay(10);
      active -= 1;
    });

    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it('빈 배열은 그대로 빈 배열을 반환한다', async () => {
    const results = await mapWithConcurrency([], 3, async (x) => x);
    expect(results).toEqual([]);
  });

  it('concurrency가 배열 길이보다 크면 전부 동시에 처리한다', async () => {
    let active = 0;
    let maxActive = 0;

    await mapWithConcurrency([1, 2, 3], 10, async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await delay(5);
      active -= 1;
    });

    expect(maxActive).toBe(3);
  });

  it('하나가 실패하면 나머지와 함께 reject된다(Promise.all 특성)', async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (x) => {
        if (x === 2) throw new Error('boom');
        return x;
      }),
    ).rejects.toThrow('boom');
  });
});
