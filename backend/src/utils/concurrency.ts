/**
 * items를 최대 concurrency개씩 동시에 처리한다. 이미지별 OCR/번역은 서로 독립적인데도
 * 지금까지는 for-of로 하나씩 순서대로 기다렸다 — 프로젝트에 이미지가 여러 장이면 그만큼
 * 그대로 곱해져서 느려진다. NVIDIA 응답이 느릴 때가 있어(최대 5분) concurrency는 적당히
 * 낮게 잡아서 두되, 최소한 이미지 개수만큼 무조건 직렬로 기다리지는 않게 한다.
 */
export async function mapWithConcurrency<T, R>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) return;
      results[current] = await fn(items[current], current);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}
