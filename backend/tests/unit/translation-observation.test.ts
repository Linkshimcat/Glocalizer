import { describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
import type { LocalizationBatchInput } from '../../src/ai/localization/localization-provider.types.js';
import type { TranslationProvider } from '../../src/translation/translation-provider.types.js';
import type { TranslationResult } from '../../src/types/localization.js';

const logs = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn() }));
vi.mock('../../src/config/logger.js', () => ({ logger: logs }));
const { withFallback } = await import('../../src/translation/translation-provider.js');
const input = { sourceText: 'PRIVATE_SOURCE_TEXT', targetLanguages: ['en'], context: {}, constraintsByLanguage: {} } as LocalizationBatchInput;
const result = { candidates: [{ text: 'PRIVATE_RESULT_TEXT' }] } as TranslationResult;
function provider(name: string, run: TranslationProvider['localizeBatch']): TranslationProvider { return { name, model: `${name}-model`, localizeBatch: run }; }

describe('translation provenance and observation', () => {
  it('returns the actual fallback model, correlates the call and logs no caption text', async () => {
    logs.info.mockClear(); logs.warn.mockClear();
    const fallback = vi.fn(async () => new Map([['en' as const, result]]));
    const translated = await withFallback(provider('openai', async () => { throw new Error('PRIVATE_SOURCE_TEXT'); }), provider('groq', fallback)).localizeBatch(input);
    expect(translated.get('en')?.execution).toEqual({ provider: 'groq', model: 'groq-model' });
    const rows = [...logs.info.mock.calls, ...logs.warn.mock.calls].map(call => call[0]);
    expect(new Set(rows.map(row => row.callId)).size).toBe(1);
    expect(rows.map(row => row.outcome).sort()).toEqual(['fallback_started', 'fallback_success', 'primary_started']);
    expect(JSON.stringify(rows)).not.toMatch(/PRIVATE_SOURCE_TEXT|PRIVATE_RESULT_TEXT/);
    expect(fallback).toHaveBeenCalledTimes(1);
  });
  it('records primary provenance and never calls fallback on success', async () => {
    const fallback = vi.fn();
    const translated = await withFallback(provider('openai', async () => new Map([['en' as const, result]])), provider('groq', fallback)).localizeBatch(input);
    expect(translated.get('en')?.execution?.model).toBe('openai-model');
    expect(fallback).not.toHaveBeenCalled();
  });
  it('logs fallback failure and preserves the original primary error', async () => {
    const error = new Error('primary');
    await expect(withFallback(provider('openai', async () => { throw error; }), provider('groq', async () => { throw new Error('fallback'); })).localizeBatch(input)).rejects.toBe(error);
    expect(logs.warn).toHaveBeenLastCalledWith(expect.objectContaining({ outcome: 'fallback_failed', actualProvider: 'groq' }), expect.any(String));
  });
});

describe('14-day observation report', () => {
  it('deduplicates records, handles partial traces and excludes old/future/non-translation logs', async () => {
    const { summarizeTranslationLogs } = await import('../../scripts/report-translation-fallback.mjs');
    const now = Date.parse('2026-10-07T00:00:00Z');
    const row = (callId: string, outcome: string, time = now - 1000) => JSON.stringify({ event: 'translation_call', callId, outcome, time, primaryProvider: 'openai', elapsedMs: 25 });
    const lines = [row('a', 'primary_started'), row('a', 'primary_success'), row('a', 'primary_success'), row('b', 'primary_started'), row('b', 'fallback_started'), row('b', 'fallback_success'), row('c', 'primary_started'), row('c', 'fallback_started'), row('c', 'fallback_failed'), row('d', 'primary_started'), row('old', 'primary_success', now - 15 * 86400000), row('future', 'primary_success', now + 1000), '{not json}', JSON.stringify({ event: 'something', time: now })];
    const report = await summarizeTranslationLogs(Readable.from(lines.map(line => `${line}\n`)), { now });
    expect(report).toMatchObject({ logicalCalls: 4, primarySuccesses: 1, fallbackCalls: 2, fallbackRate: 0.5, fallbackSuccesses: 1, fallbackFailures: 1, pendingCalls: 1, incompleteTraces: 0, invalidLines: 1 });
  });
});
