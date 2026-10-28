// QA-02: /proof 화면 숫자가 원자료(CSV)에서 다시 계산되는지 점검한다.
//
// 사용법 (frontend 폴더에서):
//   node scripts/verify-proof.mjs --api https://glocalizer-api.onrender.com/api/v1 [--groups external] [--token <계정 토큰>]
//   node scripts/verify-proof.mjs --summary summary.json --csv export.csv      # 내려받은 파일로 오프라인 점검
//
// CSV 열은 src/types/analytics.ts의 PROOF_CSV_COLUMNS를 따른다. 불일치가 있으면 종료 코드 1.
import { readFile } from 'node:fs/promises'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), all[index + 1] && !all[index + 1].startsWith('--') ? all[index + 1] : 'true'])
  return pairs
}, []))
const groups = (args.groups ?? 'external').split(',')

async function load() {
  if (args.summary && args.csv) {
    return { summary: JSON.parse(await readFile(args.summary, 'utf8')), csv: await readFile(args.csv, 'utf8') }
  }
  if (!args.api) throw new Error('--api 또는 --summary/--csv가 필요합니다.')
  const headers = args.token ? { Authorization: `Bearer ${args.token}` } : {}
  const query = new URLSearchParams({ groups: groups.join(',') })
  const [summaryResponse, csvResponse] = await Promise.all([
    fetch(`${args.api}/proof/summary?${query}`, { headers }),
    fetch(`${args.api}/proof/export.csv?${query}`, { headers }),
  ])
  if (!summaryResponse.ok || !csvResponse.ok) throw new Error(`API 응답 실패: summary ${summaryResponse.status}, csv ${csvResponse.status}`)
  return { summary: await summaryResponse.json(), csv: await csvResponse.text() }
}

/** 따옴표로 감싼 값(쉼표 포함)까지 처리하는 최소 CSV 파서 */
function parseCsv(text) {
  const rows = []
  let row = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (char === '"') quoted = false
      else cell += char
    } else if (char === '"') quoted = true
    else if (char === ',') { row.push(cell); cell = '' }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += char
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const [header, ...body] = rows.filter(r => r.some(value => value !== ''))
  return body.map(values => Object.fromEntries(header.map((key, index) => [key.trim(), values[index] ?? ''])))
}

/** nearest-rank 백분위수. 표본이 없으면 null(화면의 "측정 안 됨") */
function percentile(values, p) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)]
}

const { summary, csv } = await load()
const rows = parseCsv(csv).filter(row => groups.includes(row.experiment_group))
const count = name => rows.filter(row => row.event_name === name).length
const started = count('localization_started')
const expected = {
  sampleCount: rows.length,
  completionRate: started === 0 ? null : count('export_succeeded') / started,
  stages: Object.fromEntries(['ocr', 'translation', 'cleanup', 'total'].map(stage => {
    const durations = rows.filter(row => row.stage === stage && row.duration_ms !== '').map(row => Number(row.duration_ms)).filter(Number.isFinite)
    return [stage, { p50Ms: percentile(durations, 50), p95Ms: percentile(durations, 95), sampleCount: durations.length }]
  })),
}

const problems = []
// 건수·ms는 반올림 1 이내, 0~1 비율(완주율)은 소수 6자리까지 같아야 한다.
const same = (a, b) => (a === null || b === null) ? a === b : Math.abs(a - b) <= (Math.abs(b) >= 1 ? Math.max(1, Math.abs(b) * 0.001) : 1e-6)
const check = (label, actual, wanted) => { if (!same(actual ?? null, wanted)) problems.push(`${label}: 화면 ${actual} / 원자료 ${wanted}`) }

check('sampleCount', summary.sampleCount, expected.sampleCount)
check('completionRate', summary.completionRate, expected.completionRate)
for (const [stage, value] of Object.entries(expected.stages)) {
  check(`${stage}.p50Ms`, summary.stages?.[stage]?.p50Ms, value.p50Ms)
  check(`${stage}.p95Ms`, summary.stages?.[stage]?.p95Ms, value.p95Ms)
  check(`${stage}.sampleCount`, summary.stages?.[stage]?.sampleCount, value.sampleCount)
}
const outsideGroups = parseCsv(csv).filter(row => !groups.includes(row.experiment_group)).length
if (outsideGroups > 0) problems.push(`요청하지 않은 그룹(${groups.join(',')} 외)의 행 ${outsideGroups}개가 CSV에 섞여 있음`)

console.log(`groups=${groups.join(',')} rows=${rows.length} started=${started}`)
if (problems.length) {
  console.log('불일치:')
  for (const problem of problems) console.log(`  - ${problem}`)
  process.exit(1)
}
console.log('OK: 화면 숫자가 원자료에서 다시 계산한 값과 같습니다.')
