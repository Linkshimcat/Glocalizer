import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitForCaptionApplication } from '../../../frontend/src/lib/captionApplication';

const status = (state: string, assetState = 'completed') => ({ projectId: 'p', status: state, stage: null, progress: 100, message: '', assets: [{ assetId: 'a', status: assetState, progress: 100 }] });
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
describe('caption application status', () => {
  it('waits through processing until completion', async () => {
    const refresh = vi.fn().mockResolvedValueOnce(status('processing')).mockResolvedValue(status('completed'));
    const result = waitForCaptionApplication(refresh, 'a', 100, 10);
    await vi.advanceTimersByTimeAsync(10); await result;
    expect(refresh).toHaveBeenCalledTimes(2);
  });
  it.each(['failed', 'expired', 'created'])('does not accept %s as success', async state => {
    await expect(waitForCaptionApplication(vi.fn().mockResolvedValue(status(state)), 'a')).rejects.toBeInstanceOf(Error);
  });
  it('does not accept a missing session or a failed target asset', async () => {
    await expect(waitForCaptionApplication(vi.fn().mockResolvedValue(null), 'a')).rejects.toMatchObject({ reason: 'session' });
    await expect(waitForCaptionApplication(vi.fn().mockResolvedValue(status('completed', 'failed')), 'a')).rejects.toMatchObject({ reason: 'failed' });
  });
  it('throws when processing outlasts the deadline', async () => {
    const assertion = expect(waitForCaptionApplication(vi.fn().mockResolvedValue(status('processing')), 'a', 20, 10)).rejects.toMatchObject({ reason: 'timeout' });
    await vi.advanceTimersByTimeAsync(20); await assertion;
  });
});
