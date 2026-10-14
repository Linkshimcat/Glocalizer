import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, RequestError, requestErrorMessage } from '../../../frontend/src/lib/requestError';

beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('window', globalThis); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

function pendingFetch() {
  return vi.fn((_url, init) => new Promise<Response>((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
  }));
}

describe('API deadlines', () => {
  it('times out a mutation once without automatically retrying', async () => {
    const fetch = pendingFetch(); vi.stubGlobal('fetch', fetch);
    const result = apiFetch('/test', { method: 'POST' }, 10);
    const assertion = expect(result).rejects.toMatchObject({ code: 'REQUEST_TIMEOUT', status: 0 });
    await vi.advanceTimersByTimeAsync(10); await assertion;
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(requestErrorMessage(new RequestError('', 0, 'REQUEST_TIMEOUT'), 'en', '')).toContain('timed out');
  });
  it('keeps the deadline active while reading a stalled response body', async () => {
    vi.stubGlobal('fetch', vi.fn((_url, init) => Promise.resolve(new Response(new ReadableStream({
      start(controller) { init.signal.addEventListener('abort', () => controller.error(init.signal.reason), { once: true }); },
    })))));
    const assertion = expect(apiFetch('/test', undefined, 10)).rejects.toMatchObject({ code: 'REQUEST_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(10); await assertion;
  });
  it('preserves caller cancellation instead of calling it a timeout', async () => {
    vi.stubGlobal('fetch', pendingFetch());
    const controller = new AbortController();
    const reason = new DOMException('Cancelled by caller', 'AbortError');
    const result = apiFetch('/test', { signal: controller.signal }, 10);
    const assertion = expect(result).rejects.toBe(reason);
    controller.abort(reason); await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('preserves JSON, error headers and empty response semantics', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('{"ok":true}', { headers: { 'Retry-After': '3' } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 })));
    const response = await apiFetch('/test');
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get('retry-after')).toBe('3');
    const empty = await apiFetch('/test'); expect(empty.status).toBe(204); expect(await empty.text()).toBe('');
    expect(vi.getTimerCount()).toBe(0);
  });
});
