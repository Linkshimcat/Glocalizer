import { describe, expect, it, vi } from 'vitest';
import { withRetry } from '../../src/utils/retry.js';

describe('withRetry', () => {
  it('retry 가능한 일시 오류를 지정 횟수 안에서 복구한다', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('temporary provider failure'))
      .mockRejectedValueOnce(new Error('temporary provider failure'))
      .mockResolvedValueOnce('translated');

    await expect(withRetry(operation, { attempts: 3, delayMs: 1 })).resolves.toBe('translated');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('재시도할 수 없는 오류는 즉시 반환한다', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('invalid request'));

    await expect(withRetry(operation, { attempts: 3, delayMs: 1, shouldRetry: () => false })).rejects.toThrow('invalid request');
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
