// QA-02: /proof 화면 숫자가 원자료(CSV)에서 다시 계산되는지 점검한다.
//
// 사용법 (frontend 폴더에서):
//   node scripts/verify-proof.mjs --api https://glocalizer-api.onrender.com/api/v1 --admin-key <키> [--group external]
//   node scripts/verify-proof.mjs --summary summary.json --csv export.csv [--group external]   # 내려받은 파일로 오프라인 점검
//
// 백엔드(backend/src/analytics/proof.ts)와 같은 규칙으로 다시 계산한다: 표본=서로 다른 익명 세션,
// 완주율=시작한 프로젝트 중 내보낸 프로젝트, 백분위수=nearest-rank, 단계별 시간(있으면). 불일치가 있으면 종료 코드 1.
// 원자료 CSV는 관리자 키가 필요하므로 --api 모드에서는 --admin-key가 필수다(external summary 자체는 공개).
import { readFile } from 'node:fs/promises'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), all[index + 1] && !all[index + 1].startsWith('--') ? all[index + 1] : 'true'])
  return pairs
}, []))
const group = args.group ?? 'external'
const EVENTS = ['demo_started', 'localization_started', 'localization_completed', 'qa_reviewed', 'export_succeeded', 'export_failed']
// PR #217: 현지화 완료 이벤트의 단계별 시간. CSV에는 맨 끝에 <stage>_ms 열로 붙는다.
const STAGES = ['recognizing', 'translating', 'cleaning']

async function load() {
  if (args.summary && args.csv) {
    return { summary: JSON.parse(await readFile(args.summary, 'utf8')), csv: await readFile(args.csv, 'utf8') }
  }
  if (!args.api || !args['admin-key']) throw new Error('--api와 --admin-key, 또는 --summary와 --csv가 필요합니다.')
  const headers = { 'X-Admin-Key': args['admin-key'] }
  const query = new URLSearchParams({ group })
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

/** nearest-rank 백분위수 — 백엔드와 같은 방식(보간 없음) */
function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)]
}

const { summary, csv } = await load()
const allRows = parseCsv(csv)
const rows = allRows.filter(row => row.experiment_group === group)

const eventCounts = Object.fromEntries(EVENTS.map(name => [name, rows.filter(row => row.event_name === name).length]))
const started = new Set(rows.filter(row => row.event_name === 'localization_started' && row.project_id).map(row => row.project_id))
const exported = new Set(rows.filter(row => row.event_name === 'export_succeeded' && row.project_id && started.has(row.project_id)).map(row => row.project_id))
const durations = Object.fromEntries(EVENTS.map(name => {
  const values = rows.filter(row => row.event_name === name && row.duration_ms !== '').map(row => Number(row.duration_ms)).filter(Number.isFinite)
  return [name, values.length === 0 ? null : { n: values.length, p50Ms: percentile(values, 50), p95Ms: percentile(values, 95) }]
}))
const times = rows.map(row => new Date(row.occurred_at).toISOString()).sort()
const expected = {
  sampleSize: new Set(rows.map(row => row.anonymous_session_id)).size,
  period: times.length ? { from: times[0], to: times[times.length - 1] } : null,
  completion: { startedProjects: started.size, exportedProjects: exported.size, rate: started.size === 0 ? null : exported.size / started.size },
}

const problems = []
const near = (a, b) => (a === null || b === null || a === undefined || b === undefined) ? (a ?? null) === (b ?? null) : Math.abs(a - b) <= 1e-6
const check = (label, actual, wanted) => { if (!near(actual, wanted)) problems.push(`${label}: 화면 ${actual ?? 'null'} / 원자료 ${wanted ?? 'null'}`) }
const checkTime = (label, actual, wanted) => { if ((actual ? new Date(actual).toISOString() : null) !== wanted) problems.push(`${label}: 화면 ${actual ?? 'null'} / 원자료 ${wanted ?? 'null'}`) }

if (summary.experimentGroup !== group) problems.push(`experimentGroup: 요청 ${group} / 응답 ${summary.experimentGroup}`)
check('sampleSize', summary.sampleSize, expected.sampleSize)
checkTime('period.from', summary.period?.from, expected.period?.from ?? null)
checkTime('period.to', summary.period?.to, expected.period?.to ?? null)
check('completion.startedProjects', summary.completion?.startedProjects, expected.completion.startedProjects)
check('completion.exportedProjects', summary.completion?.exportedProjects, expected.completion.exportedProjects)
check('completion.rate', summary.completion?.rate, expected.completion.rate)
for (const name of EVENTS) {
  check(`eventCounts.${name}`, summary.eventCounts?.[name], eventCounts[name])
  const wanted = durations[name], actual = summary.durations?.[name] ?? null
  if (wanted === null || actual === null) { if (wanted !== actual) problems.push(`durations.${name}: 화면 ${JSON.stringify(actual)} / 원자료 ${JSON.stringify(wanted)}`) }
  else for (const key of ['n', 'p50Ms', 'p95Ms']) check(`durations.${name}.${key}`, actual[key], wanted[key])
}
// 단계별 시간: 서버가 stageDurations를 주고 CSV에 *_ms 열이 있을 때만 대조한다(둘 중 하나만 있으면 불일치로 본다).
const csvHasStages = allRows.length > 0 && STAGES.every(stage => `${stage}_ms` in allRows[0])
if (summary.stageDurations && (csvHasStages || allRows.length === 0)) {
  for (const stage of STAGES) {
    const values = rows.filter(row => row.event_name === 'localization_completed' && row[`${stage}_ms`] !== '' && row[`${stage}_ms`] !== undefined)
      .map(row => Number(row[`${stage}_ms`])).filter(Number.isFinite)
    const wanted = values.length === 0 ? null : { n: values.length, p50Ms: percentile(values, 50), p95Ms: percentile(values, 95) }
    const actual = summary.stageDurations[stage] ?? null
    if (wanted === null || actual === null) { if (wanted !== actual) problems.push(`stageDurations.${stage}: 화면 ${JSON.stringify(actual)} / 원자료 ${JSON.stringify(wanted)}`) }
    else for (const key of ['n', 'p50Ms', 'p95Ms']) check(`stageDurations.${stage}.${key}`, actual[key], wanted[key])
  }
} else if (summary.stageDurations || csvHasStages) {
  problems.push(`단계별 시간: summary.stageDurations ${summary.stageDurations ? '있음' : '없음'} / CSV *_ms 열 ${csvHasStages ? '있음' : '없음'} — 서버 버전이 섞였을 수 있음`)
}

const otherGroups = allRows.length - rows.length
if (otherGroups > 0) problems.push(`요청한 그룹(${group}) 외의 행 ${otherGroups}개가 CSV에 섞여 있음`)

console.log(`group=${group} rows=${rows.length} sessions=${expected.sampleSize} startedProjects=${started.size}`)
if (problems.length) {
  console.log('불일치:')
  for (const problem of problems) console.log(`  - ${problem}`)
  process.exit(1)
}
console.log('OK: 화면 숫자가 원자료에서 다시 계산한 값과 같습니다.')
