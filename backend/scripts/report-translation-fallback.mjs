import fs from 'node:fs'
import readline from 'node:readline'

// Input: exported Pino JSONL logs. Only aggregate counts are emitted; payload text is never echoed.
export async function summarizeTranslationLogs(input, { days = 14, now = Date.now() } = {}) {
  if (!Number.isFinite(days) || days <= 0 || !Number.isFinite(now)) throw new Error('Invalid observation window')
  const since = now - days * 86_400_000
  const calls = new Map()
  const seen = new Set()
  let invalidLines = 0
  const outcomes = new Set(['primary_started', 'primary_success', 'primary_failed', 'fallback_started', 'fallback_success', 'fallback_failed'])
  const errors = {}
  for await (const line of readline.createInterface({ input, crlfDelay: Infinity })) {
    let row
    try { row = JSON.parse(line) } catch { invalidLines++; continue }
    const time = typeof row.time === 'number' ? row.time : Date.parse(row.time)
    if (row.event !== 'translation_call' || !outcomes.has(row.outcome) || typeof row.callId !== 'string' || !Number.isFinite(time) || time < since || time > now) continue
    const key = `${row.callId}:${row.outcome}`
    if (seen.has(key)) continue
    seen.add(key)
    const call = calls.get(row.callId) ?? { outcomes: new Set(), elapsedMs: 0, primary: String(row.primaryProvider ?? 'unknown') }
    call.outcomes.add(row.outcome)
    if (Number.isFinite(row.elapsedMs)) call.elapsedMs = Math.max(call.elapsedMs, row.elapsedMs)
    calls.set(row.callId, call)
    if (typeof row.errorCode === 'string' && /^[A-Z_]{1,80}$/.test(row.errorCode)) errors[row.errorCode] = (errors[row.errorCode] ?? 0) + 1
  }
  const rows = [...calls.values()]
  const fallbackRows = rows.filter(row => [...row.outcomes].some(outcome => outcome.startsWith('fallback_')))
  const terminal = row => ['primary_success', 'primary_failed', 'fallback_success', 'fallback_failed'].some(outcome => row.outcomes.has(outcome))
  const latencies = rows.filter(terminal).map(row => row.elapsedMs).sort((a, b) => a - b)
  const pct = fraction => latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor(fraction * latencies.length))] : null
  const byPrimary = Object.fromEntries([...new Set(rows.map(row => row.primary))].map(provider => {
    const group = rows.filter(row => row.primary === provider)
    const fallback = group.filter(row => [...row.outcomes].some(outcome => outcome.startsWith('fallback_'))).length
    return [provider, { calls: group.length, fallbackCalls: fallback, fallbackRate: fallback / group.length }]
  }))
  return {
    from: new Date(since).toISOString(), to: new Date(now).toISOString(), logicalCalls: rows.length,
    primarySuccesses: rows.filter(row => row.outcomes.has('primary_success')).length,
    fallbackCalls: fallbackRows.length, fallbackRate: rows.length ? fallbackRows.length / rows.length : null,
    fallbackSuccesses: fallbackRows.filter(row => row.outcomes.has('fallback_success')).length,
    fallbackFailures: fallbackRows.filter(row => row.outcomes.has('fallback_failed')).length,
    fallbackSuccessRate: fallbackRows.length ? fallbackRows.filter(row => row.outcomes.has('fallback_success')).length / fallbackRows.length : null,
    pendingCalls: rows.filter(row => !terminal(row)).length,
    incompleteTraces: rows.filter(row => !row.outcomes.has('primary_started')).length,
    primaryFailuresWithoutFallback: rows.filter(row => row.outcomes.has('primary_failed')).length,
    latencyMs: { p50: pct(0.5), p95: pct(0.95) }, byPrimary, errors, invalidLines,
  }
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  const args = process.argv.slice(2)
  const flag = (name, fallback) => { const index = args.indexOf(`--${name}`); return index < 0 ? fallback : args[index + 1] }
  const file = flag('input', '-')
  const report = await summarizeTranslationLogs(file === '-' ? process.stdin : fs.createReadStream(file), {
    days: Number(flag('days', '14')), now: flag('now', '') ? Date.parse(flag('now', '')) : Date.now(),
  })
  console.log(JSON.stringify(report, null, 2))
}
