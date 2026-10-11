import fs from 'node:fs'
import readline from 'node:readline'
import { pathToFileURL } from 'node:url'

const provider = (value) => (['openai', 'groq'].includes(value) ? value : 'unknown')
const outcomes = new Set([
  'primary_started',
  'primary_success',
  'primary_failed',
  'fallback_started',
  'fallback_success',
  'fallback_failed',
  'call_cancelled',
])
const terminalOutcomes = new Set([
  'primary_success',
  'primary_failed',
  'fallback_success',
  'fallback_failed',
  'call_cancelled',
])
const reasons = new Set([
  'deadline',
  'cancelled',
  'timeout',
  'network',
  'rate_limit',
  'server',
  'authentication',
  'configuration',
  'invalid_json',
  'schema',
  'missing_language',
  'validation',
  'empty_response',
  'persistence',
  'unknown',
])
const languages = new Set(['en', 'ja', 'zh'])
const percentile = (values, fraction) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  return sorted.length ? sorted[Math.max(0, Math.ceil(fraction * sorted.length) - 1)] : null
}
const latency = (values) => ({ p50: percentile(values, 0.5), p95: percentile(values, 0.95) })
const ratio = (a, b) => (b ? a / b : null)
const increment = (object, key) => {
  object[key] = (object[key] ?? 0) + 1
}
const timestamp = (value) => (typeof value === 'number' ? value : Date.parse(value))

/** Accept Pino rows and Render wrappers/arrays without echoing arbitrary log payloads. */
export function unwrapTranslationLog(value, inheritedTime) {
  if (Array.isArray(value)) return value.flatMap((row) => unwrapTranslationLog(row, inheritedTime))
  if (!value || typeof value !== 'object') return []
  const time = value.time ?? value.timestamp ?? inheritedTime
  if (typeof value.event === 'string') return [{ ...value, time }]
  if (Array.isArray(value.logs)) return unwrapTranslationLog(value.logs, time)
  if (value.log && typeof value.log === 'object') return unwrapTranslationLog(value.log, time)
  const message = value.message ?? (typeof value.log === 'string' ? value.log : undefined)
  if (typeof message === 'string') {
    try {
      return unwrapTranslationLog(JSON.parse(message), time)
    } catch {
      return []
    }
  }
  return []
}

export async function summarizeTranslationLogs(
  input,
  { days = 14, now = Date.now(), coverage } = {},
) {
  if (!Number.isFinite(days) || days <= 0 || !Number.isFinite(now))
    throw new Error('Invalid observation window')
  const since = now - days * 86_400_000
  const calls = new Map(),
    operations = new Map(),
    saved = new Map(),
    seen = new Set()
  let invalidLines = 0
  const languageFailureRows = []
  // JSON array exports and JSONL are both accepted. Arrays are buffered; JSONL is streamed.
  let arrayBuffer = ''
  let arrayMode = false
  const consume = (value) => {
    for (const row of unwrapTranslationLog(value)) {
      const time = timestamp(row.time)
      if (!Number.isFinite(time) || time > now) continue
      if (
        ![
          'translation_call',
          'translation_attempt',
          'translation_operation',
          'translation_language',
        ].includes(row.event)
      )
        continue
      const callId = typeof row.callId === 'string' ? row.callId : undefined
      const operationId = typeof row.operationId === 'string' ? row.operationId : undefined
      const key = JSON.stringify([
        row.event,
        callId,
        operationId,
        row.outcome,
        row.attempt,
        row.languageCode,
        time,
      ])
      if (seen.has(key)) continue
      seen.add(key)
      if (row.event === 'translation_call' && callId && outcomes.has(row.outcome)) {
        const call = calls.get(callId) ?? {
          rows: new Map(),
          primary: provider(row.primaryProvider),
          operationId,
          attempts: [],
          time,
        }
        const prior = call.rows.get(row.outcome)
        if (
          !prior ||
          (row.outcome === 'primary_started'
            ? time < timestamp(prior.time)
            : time > timestamp(prior.time))
        )
          call.rows.set(row.outcome, row)
        call.time = Math.min(call.time, time)
        calls.set(callId, call)
      } else if (row.event === 'translation_attempt' && callId) {
        const call = calls.get(callId) ?? {
          rows: new Map(),
          primary: provider(row.primaryProvider),
          operationId,
          attempts: [],
          time,
        }
        call.attempts.push(row)
        calls.set(callId, call)
      } else if (
        row.event === 'translation_operation' &&
        operationId &&
        ['operation_started', 'operation_completed'].includes(row.outcome)
      ) {
        const operation = operations.get(operationId) ?? {
          rows: new Map(),
          primary: provider(row.primaryProvider),
          time,
        }
        const prior = operation.rows.get(row.outcome)
        if (
          !prior ||
          (row.outcome === 'operation_started'
            ? time < timestamp(prior.time)
            : time > timestamp(prior.time))
        )
          operation.rows.set(row.outcome, row)
        operation.time = Math.min(operation.time, time)
        operations.set(operationId, operation)
      } else if (
        row.event === 'translation_language' &&
        operationId &&
        languages.has(row.languageCode) &&
        row.outcome === 'save_failed'
      ) {
        languageFailureRows.push(row)
      } else if (
        row.event === 'translation_language' &&
        operationId &&
        languages.has(row.languageCode) &&
        row.outcome === 'saved'
      ) {
        const id = `${operationId}:${row.languageCode}`,
          previous = saved.get(id)
        if (!previous || timestamp(previous.time) < time) saved.set(id, row)
      }
    }
  }
  for await (const line of readline.createInterface({ input, crlfDelay: Infinity })) {
    if (!line.trim()) continue
    if (!arrayBuffer && line.trim().startsWith('[')) arrayMode = true
    if (arrayMode) {
      arrayBuffer += `${line}\n`
      continue
    }
    try {
      consume(JSON.parse(line))
    } catch {
      invalidLines++
    }
  }
  if (arrayBuffer) {
    try {
      consume(JSON.parse(arrayBuffer))
    } catch {
      invalidLines++
    }
  }
  const rows = [...calls.values()].filter((call) => {
    const start = call.rows.get('primary_started')
    return (start ? timestamp(start.time) : call.time) >= since && call.rows.size > 0
  })
  const started = rows.filter((call) => call.rows.has('primary_started'))
  const fallback = (call) =>
    ['fallback_started', 'fallback_success', 'fallback_failed'].some((outcome) =>
      call.rows.has(outcome),
    )
  const fallbackRows = rows.filter(fallback)
  const terminal = (call) =>
    [...call.rows.values()]
      .filter((row) => terminalOutcomes.has(row.outcome))
      .sort((a, b) => timestamp(b.time) - timestamp(a.time))[0]
  const primaryFailures = {},
    fallbackFailures = {},
    attemptFailureReasons = { openai: {}, groq: {} },
    errors = {},
    retryCounts = { openai: 0, groq: 0 },
    httpAttempts = { openai: 0, groq: 0 },
    waitMs = { queue: 0, cooldown: 0 }
  for (const call of rows) {
    const primaryFailure = call.rows.get('fallback_started') ?? call.rows.get('primary_failed')
    const fallbackFailure = call.rows.get('fallback_failed')
    for (const [failure, counts] of [
      [primaryFailure, primaryFailures],
      [fallbackFailure, fallbackFailures],
    ]) {
      if (!failure) continue
      increment(counts, reasons.has(failure.failureReason) ? failure.failureReason : 'unknown')
      if (typeof failure.errorCode === 'string' && /^[A-Z_]{1,80}$/.test(failure.errorCode))
        increment(errors, failure.errorCode)
    }
    for (const attempt of call.attempts) {
      if (
        attempt.outcome === 'attempt_started' &&
        ['openai', 'groq'].includes(attempt.actualProvider)
      )
        httpAttempts[attempt.actualProvider]++
      if (
        attempt.outcome === 'attempt_failed' &&
        ['openai', 'groq'].includes(attempt.actualProvider)
      )
        increment(
          attemptFailureReasons[attempt.actualProvider],
          reasons.has(attempt.failureReason) ? attempt.failureReason : 'unknown',
        )
      if (
        attempt.outcome === 'attempt_started' &&
        attempt.attempt > 1 &&
        ['openai', 'groq'].includes(attempt.actualProvider)
      )
        retryCounts[attempt.actualProvider]++
      if (attempt.outcome === 'queue_wait' && Number.isFinite(attempt.queueWaitMs))
        waitMs.queue += Math.max(0, attempt.queueWaitMs)
      if (attempt.outcome === 'cooldown_wait' && Number.isFinite(attempt.cooldownWaitMs))
        waitMs.cooldown += Math.max(0, attempt.cooldownWaitMs)
    }
  }
  const byPrimary = Object.fromEntries(
    ['openai', 'groq', 'unknown']
      .map((name) => {
        const group = started.filter((call) => call.primary === name)
        const fallbackCalls = group.filter(fallback).length
        return [
          name,
          { calls: group.length, fallbackCalls, fallbackRate: ratio(fallbackCalls, group.length) },
        ]
      })
      .filter(([, group]) => group.calls > 0),
  )
  const opRows = [...operations.entries()].filter(([, operation]) => {
    const start = operation.rows.get('operation_started')
    return (start ? timestamp(start.time) : operation.time) >= since
  })
  const startedOps = opRows.filter(([, operation]) => operation.rows.has('operation_started'))
  const openaiOps = startedOps.filter(([, operation]) => operation.primary === 'openai')
  const eligibleOps = new Set(opRows.map(([id]) => id))
  const opFallback = new Set(
    rows
      .filter(fallback)
      .map((call) => call.operationId)
      .filter((id) => eligibleOps.has(id)),
  )
  const savedRows = [...saved.values()].filter((row) => {
    if (!eligibleOps.has(row.operationId)) return false
    const completion = operations.get(row.operationId).rows.get('operation_completed')
    return (
      !completion ||
      (Array.isArray(completion.savedLanguages) &&
        completion.savedLanguages.includes(row.languageCode))
    )
  })
  const languageFailureReasons = {}
  for (const row of languageFailureRows.filter((row) => eligibleOps.has(row.operationId)))
    increment(
      languageFailureReasons,
      reasons.has(row.failureReason) ? row.failureReason : 'unknown',
    )
  const incompleteTraces = rows.filter((call) => !call.rows.has('primary_started')).length
  const incompleteOperations = opRows.filter(
    ([, operation]) => !operation.rows.has('operation_started'),
  ).length
  const openaiCalls = started.filter((call) => call.primary === 'openai')
  const completeCoverage =
    coverage?.complete === true &&
    Number.isFinite(timestamp(coverage.from)) &&
    timestamp(coverage.from) <= since &&
    timestamp(coverage.to) >= now
  return {
    from: new Date(since).toISOString(),
    to: new Date(now).toISOString(),
    measurementStatus: !started.length
      ? 'unmeasured'
      : completeCoverage && !incompleteTraces && !incompleteOperations && !invalidLines
        ? 'measured'
        : 'partial',
    coverage: {
      verified: completeCoverage,
      ...(coverage
        ? { from: coverage.from, to: coverage.to, complete: coverage.complete === true }
        : {}),
    },
    logicalCalls: rows.length,
    startedCalls: started.length,
    primarySuccesses: rows.filter((call) => call.rows.has('primary_success')).length,
    fallbackCalls: fallbackRows.length,
    fallbackRate: ratio(openaiCalls.filter(fallback).length, openaiCalls.length),
    fallbackSuccesses: fallbackRows.filter((call) => call.rows.has('fallback_success')).length,
    fallbackFailures: fallbackRows.filter((call) => call.rows.has('fallback_failed')).length,
    fallbackSuccessRate: ratio(
      fallbackRows.filter((call) => call.rows.has('fallback_success')).length,
      fallbackRows.length,
    ),
    pendingCalls: rows.filter((call) => !terminal(call)).length,
    cancelledCalls: rows.filter((call) => call.rows.has('call_cancelled')).length,
    incompleteTraces,
    primaryFailuresWithoutFallback: rows.filter((call) => call.rows.has('primary_failed')).length,
    latencyMs: latency(rows.map((call) => terminal(call)?.elapsedMs)),
    successLatencyMs: latency(
      rows
        .filter((call) => call.rows.has('primary_success') || call.rows.has('fallback_success'))
        .map((call) => terminal(call)?.elapsedMs),
    ),
    transitionLatencyMs: latency(rows.map((call) => call.rows.get('fallback_started')?.elapsedMs)),
    providerLatencyMs: {
      openai: latency(
        rows
          .filter((call) => call.primary === 'openai')
          .map(
            (call) =>
              call.rows.get('fallback_started')?.primaryElapsedMs ??
              call.rows.get('primary_success')?.providerElapsedMs ??
              call.rows.get('primary_failed')?.providerElapsedMs,
          ),
      ),
      groq: latency(
        rows.flatMap((call) =>
          [...call.rows.values()]
            .filter((row) => terminalOutcomes.has(row.outcome) && row.actualProvider === 'groq')
            .map((row) => row.providerElapsedMs),
        ),
      ),
    },
    initialTransitionLatencyMs: latency(
      rows
        .filter((call) => call.rows.get('primary_started')?.phase !== 'language_recovery')
        .map((call) => call.rows.get('fallback_started')?.elapsedMs),
    ),
    byPrimary,
    errors,
    languageFailureReasons,
    primaryFailureReasons: primaryFailures,
    fallbackFailureReasons: fallbackFailures,
    attemptFailureReasons,
    retryCounts,
    httpAttempts,
    waitMs,
    invalidLines,
    operations: {
      started: startedOps.length,
      openaiStarted: openaiOps.length,
      fallbackOperations: openaiOps.filter(([id]) => opFallback.has(id)).length,
      fallbackRate: ratio(openaiOps.filter(([id]) => opFallback.has(id)).length, openaiOps.length),
      pending: startedOps.filter(([, operation]) => !operation.rows.has('operation_completed'))
        .length,
      incomplete: incompleteOperations,
    },
    delivered: {
      savedLanguages: savedRows.length,
      groqLanguages: savedRows.filter((row) => row.actualProvider === 'groq').length,
      groqRate: ratio(
        savedRows.filter((row) => row.actualProvider === 'groq').length,
        savedRows.length,
      ),
      needsReviewLanguages: savedRows.filter((row) => row.needsReview === true).length,
    },
    notes: [
      'Rates describe observed starts, not a guaranteed complete 14-day population.',
      ...(completeCoverage ? [] : ['Log coverage/retention has not been verified.']),
      ...(incompleteTraces || incompleteOperations ? ['Some traces have no observed start.'] : []),
    ],
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  const flag = (name, fallback) => {
    const i = args.indexOf(`--${name}`)
    return i < 0 ? fallback : args[i + 1]
  }
  const file = flag('input', '-')
  const coverageFile = flag('coverage', '')
  const report = await summarizeTranslationLogs(
    file === '-' ? process.stdin : fs.createReadStream(file),
    {
      days: Number(flag('days', '14')),
      now: flag('now', '') ? Date.parse(flag('now', '')) : Date.now(),
      coverage: coverageFile ? JSON.parse(fs.readFileSync(coverageFile, 'utf8')) : undefined,
    },
  )
  console.log(JSON.stringify(report, null, 2))
}
