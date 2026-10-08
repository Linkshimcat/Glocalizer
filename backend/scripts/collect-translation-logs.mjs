import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { unwrapTranslationLog } from './report-translation-fallback.mjs'
const execute = promisify(execFile)
const fields = [
  'event',
  'operationId',
  'callId',
  'phase',
  'outcome',
  'time',
  'primaryProvider',
  'primaryModel',
  'actualProvider',
  'actualModel',
  'promptVersion',
  'targetLanguages',
  'savedLanguages',
  'failedLanguages',
  'languageCode',
  'needsReview',
  'elapsedMs',
  'providerElapsedMs',
  'primaryElapsedMs',
  'providerMs',
  'errorCode',
  'failureReason',
  'httpStatus',
  'attempt',
  'queueWaitMs',
  'cooldownWaitMs',
  'requestedWaitMs',
  'promptTokens',
  'completionTokens',
]

/** Bisect saturated ranges rather than silently accepting the CLI's result limit. */
export async function collectTranslationLogs({ from, to, query, limit = 100, maxQueries = 1000 }) {
  if (
    !Number.isFinite(from) ||
    !Number.isFinite(to) ||
    from >= to ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    !Number.isInteger(maxQueries) ||
    maxQueries < 1
  )
    throw new Error('Invalid collection range or limits')
  const rows = [],
    seen = new Set(),
    pending = [[from, to]]
  let queries = 0,
    queryComplete = true
  while (pending.length) {
    if (queries >= maxQueries) {
      queryComplete = false
      break
    }
    const [start, end] = pending.pop()
    const result = await query(start, end, limit)
    if (!Array.isArray(result)) throw new Error('Unsupported Render log response')
    queries++
    for (const raw of result) {
      const key =
        typeof raw.id === 'string'
          ? raw.id
          : createHash('sha256').update(JSON.stringify(raw)).digest('hex')
      if (seen.has(key)) continue
      seen.add(key)
      for (const row of unwrapTranslationLog(raw)) {
        if (
          ![
            'translation_call',
            'translation_attempt',
            'translation_operation',
            'translation_language',
          ].includes(row.event)
        )
          continue
        rows.push(
          Object.fromEntries(
            fields.filter((field) => row[field] !== undefined).map((field) => [field, row[field]]),
          ),
        )
      }
    }
    if (result.length >= limit) {
      if (end - start <= 1) {
        queryComplete = false
        continue
      }
      const middle = Math.floor((start + end) / 2)
      // Overlap at the boundary: Render timestamps can be more precise than milliseconds.
      pending.push([start, middle], [middle, end])
    }
  }
  return { rows, queries, queryComplete }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  const flag = (name, fallback) => {
    const i = args.indexOf(`--${name}`)
    if (i >= 0 && (!args[i + 1] || args[i + 1].startsWith('--')))
      throw new Error(`Missing --${name} value`)
    return i < 0 ? fallback : args[i + 1]
  }
  const service = flag('service', '')
  if (!/^srv-[a-z0-9]+$/.test(service))
    throw new Error('--service requires the existing Glocalizer Render service ID')
  const days = Number(flag('days', '14'))
  if (!Number.isFinite(days) || days <= 0) throw new Error('days must be positive')
  const to = Date.parse(flag('to', new Date().toISOString())),
    from = to - days * 86400000
  const output = path.resolve(flag('out', 'benchmarks/translation/results/production.jsonl'))
  const retainedFrom = Date.parse(flag('retained-from', ''))
  fs.mkdirSync(path.dirname(output), { recursive: true })
  const result = await collectTranslationLogs({
    from,
    to,
    maxQueries: Number(flag('max-queries', '1000')),
    query: async (start, end, limit) => {
      const { stdout } = await execute(
        'render',
        [
          'logs',
          '--resources',
          service,
          '--output',
          'json',
          '--text',
          'translation_',
          '--direction',
          'backward',
          '--start',
          new Date(start).toISOString(),
          '--end',
          new Date(end).toISOString(),
          '--limit',
          String(limit),
        ],
        { maxBuffer: 16 * 1024 * 1024, timeout: 60_000 },
      )
      const value = JSON.parse(stdout)
      return Array.isArray(value) ? value : value.logs
    },
  })
  fs.writeFileSync(output, result.rows.map((row) => JSON.stringify(row)).join('\n') + '\n', {
    mode: 0o600,
  })
  const coverage = {
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
    queryComplete: result.queryComplete,
    complete: result.queryComplete && Number.isFinite(retainedFrom) && retainedFrom <= from,
    retainedFrom: Number.isFinite(retainedFrom) ? new Date(retainedFrom).toISOString() : null,
    collectedAt: new Date().toISOString(),
    queries: result.queries,
    rows: result.rows.length,
  }
  fs.writeFileSync(`${output}.coverage.json`, JSON.stringify(coverage, null, 2), { mode: 0o600 })
  console.log(JSON.stringify({ output, ...coverage }, null, 2))
  if (!result.queryComplete) process.exitCode = 2
}
