import { describe, expect, it } from 'vitest';
import { Readable } from 'node:stream';
const { summarizeTranslationLogs, unwrapTranslationLog } =
  await import('../../scripts/report-translation-fallback.mjs');
const { collectTranslationLogs } = await import('../../scripts/collect-translation-logs.mjs');
const now = Date.parse('2026-10-08T00:00:00Z');
const base = {
  time: now - 1000,
  event: 'translation_call',
  primaryProvider: 'openai',
  elapsedMs: 20,
};
const summarize = (rows: unknown[]) =>
  summarizeTranslationLogs(Readable.from(rows.map((row) => `${JSON.stringify(row)}\n`)), { now });
describe('translation operational reporting', () => {
  it('uses only OpenAI starts as the denominator and distinguishes delivered results', async () => {
    const rows = [
      { ...base, callId: 'a', operationId: 'op', outcome: 'primary_started' },
      {
        ...base,
        callId: 'a',
        operationId: 'op',
        outcome: 'fallback_started',
        failureReason: 'server',
      },
      {
        ...base,
        callId: 'a',
        operationId: 'op',
        outcome: 'fallback_success',
        actualProvider: 'groq',
      },
      {
        ...base,
        callId: 'b',
        operationId: 'op',
        phase: 'language_recovery',
        outcome: 'primary_started',
      },
      {
        ...base,
        callId: 'b',
        operationId: 'op',
        outcome: 'primary_success',
        actualProvider: 'openai',
      },
      { ...base, callId: 'direct', primaryProvider: 'groq', outcome: 'primary_started' },
      { ...base, callId: 'direct', primaryProvider: 'groq', outcome: 'primary_success' },
      { ...base, event: 'translation_operation', operationId: 'op', outcome: 'operation_started' },
      {
        ...base,
        event: 'translation_operation',
        operationId: 'op',
        outcome: 'operation_completed',
        savedLanguages: ['en', 'ja'],
      },
      {
        ...base,
        event: 'translation_language',
        operationId: 'op',
        outcome: 'saved',
        languageCode: 'en',
        actualProvider: 'groq',
      },
      {
        ...base,
        event: 'translation_language',
        operationId: 'op',
        outcome: 'saved',
        languageCode: 'ja',
        actualProvider: 'openai',
      },
    ];
    expect(await summarize([...rows, ...rows].reverse())).toMatchObject({
      logicalCalls: 3,
      fallbackRate: 0.5,
      primaryFailureReasons: { server: 1 },
      operations: { started: 1, fallbackOperations: 1, fallbackRate: 1 },
      delivered: { savedLanguages: 2, groqLanguages: 1, groqRate: 0.5 },
    });
  });
  it('excludes traces started before the observation window', async () => {
    const report = await summarize([
      { ...base, callId: 'old', outcome: 'primary_started', time: now - 15 * 86400000 },
      { ...base, callId: 'old', outcome: 'fallback_success' },
    ]);
    expect(report).toMatchObject({
      logicalCalls: 0,
      fallbackRate: null,
      measurementStatus: 'unmeasured',
    });
  });
  it('marks missing starts and unverified retention as partial', async () => {
    expect(
      await summarize([
        { ...base, callId: 'started', outcome: 'primary_started' },
        { ...base, callId: 'partial', outcome: 'fallback_success' },
      ]),
    ).toMatchObject({
      incompleteTraces: 1,
      measurementStatus: 'partial',
      coverage: { verified: false },
    });
  });
  it('accepts Render wrappers and multiline array exports without echoing captions', async () => {
    const exported = [
      {
        timestamp: new Date(now - 1000).toISOString(),
        message: JSON.stringify({
          ...base,
          callId: 'x',
          outcome: 'primary_started',
          sourceText: 'PRIVATE_SOURCE',
        }),
      },
      {
        timestamp: new Date(now - 900).toISOString(),
        message: JSON.stringify({ ...base, callId: 'x', outcome: 'primary_success' }),
      },
    ];
    const report = await summarizeTranslationLogs(
      Readable.from([JSON.stringify(exported, null, 2)]),
      { now },
    );
    expect(report).toMatchObject({ logicalCalls: 1, primarySuccesses: 1 });
    expect(JSON.stringify(report)).not.toContain('PRIVATE_SOURCE');
    expect(unwrapTranslationLog({ logs: exported })).toHaveLength(2);
  });
  it('keeps save failures separate from provider failures', async () => {
    const report = await summarize([
      { ...base, event: 'translation_operation', operationId: 'op', outcome: 'operation_started' },
      {
        ...base,
        event: 'translation_language',
        operationId: 'op',
        languageCode: 'en',
        outcome: 'save_failed',
        failureReason: 'validation',
      },
    ]);
    expect(report.languageFailureReasons).toEqual({ validation: 1 });
    expect(report.delivered.groqRate).toBeNull();
  });
  it('counts cancellation as terminal without inflating success latency', async () => {
    expect(
      await summarize([
        { ...base, callId: 'x', outcome: 'primary_started' },
        { ...base, callId: 'x', outcome: 'call_cancelled', elapsedMs: 500 },
      ]),
    ).toMatchObject({
      pendingCalls: 0,
      cancelledCalls: 1,
      latencyMs: { p95: 500 },
      successLatencyMs: { p95: null },
    });
  });
});
describe('Render log collection', () => {
  it('bisects saturated ranges, deduplicates overlaps and exports only safe fields', async () => {
    const records = [100, 300, 600, 900].map((time, i) => ({
      id: `log-${i}`,
      timestamp: new Date(time).toISOString(),
      message: JSON.stringify({
        ...base,
        time,
        callId: `call-${i}`,
        outcome: 'primary_started',
        sourceText: 'PRIVATE_SOURCE',
        err: 'PRIVATE_ERROR',
      }),
    }));
    const result = await collectTranslationLogs({
      from: 0,
      to: 1000,
      limit: 3,
      query: async (start: number, end: number, limit: number) =>
        records
          .filter((row) => Date.parse(row.timestamp) >= start && Date.parse(row.timestamp) <= end)
          .slice(0, limit),
    });
    expect(result.queryComplete).toBe(true);
    expect(result.rows).toHaveLength(4);
    expect(result.queries).toBeGreaterThan(1);
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE_SOURCE|PRIVATE_ERROR/);
  });
  it('marks same-timestamp saturation incomplete', async () => {
    const rows = [0, 1, 2].map((id) => ({
      id: String(id),
      message: JSON.stringify({ ...base, time: 1, callId: String(id), outcome: 'primary_started' }),
    }));
    const result = await collectTranslationLogs({
      from: 0,
      to: 10,
      limit: 2,
      maxQueries: 30,
      query: async (start: number, end: number, limit: number) =>
        start <= 1 && end >= 1 ? rows.slice(0, limit) : [],
    });
    expect(result.queryComplete).toBe(false);
    expect(result.rows).toHaveLength(2);
  });
});
