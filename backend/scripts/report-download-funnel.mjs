import fs from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

/** A creation cohort, deduplicated by project. Download means browser handoff, not a saved-file receipt. */
export function summarizeDownloadFunnel({ projects, downloadEvents }, { days = 14, now = Date.now() } = {}) {
  if (!Number.isFinite(days) || days <= 0 || !Number.isFinite(now)) throw new Error('Invalid observation window')
  const since = now - days * 86_400_000
  const cohort = new Map(projects.filter(project => {
    const time = Date.parse(project.created_at)
    return time >= since && time <= now
  }).map(project => [project.id, project]))
  const processed = new Set([...cohort.values()].filter(project => project.status === 'completed').map(project => project.id))
  const downloaded = new Set(), byKind = { single: new Set(), zip: new Set() }
  let events = 0
  for (const event of downloadEvents) {
    const project = cohort.get(event.project_id), time = Date.parse(event.created_at)
    if (!project || !processed.has(project.id) || !['single', 'zip'].includes(event.kind) || time < Date.parse(project.created_at) || time > now || !Number.isFinite(time)) continue
    events++
    downloaded.add(project.id)
    byKind[event.kind].add(project.id)
  }
  return { from: new Date(since).toISOString(), to: new Date(now).toISOString(), cohortBasis: 'project.created_at', createdProjects: cohort.size, processedProjects: processed.size, downloadedProjects: downloaded.size, downloadConversion: processed.size ? downloaded.size / processed.size : null, downloadEvents: events, repeatEvents: events - downloaded.size, projectsByKind: Object.fromEntries(Object.entries(byKind).map(([kind, ids]) => [kind, ids.size])) }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  const flag = (name, fallback) => { const index = args.indexOf(`--${name}`); return index < 0 ? fallback : args[index + 1] }
  const options = { days: Number(flag('days', '14')), now: flag('now', '') ? Date.parse(flag('now', '')) : Date.now() }
  if (!Number.isFinite(options.days) || options.days <= 0 || !Number.isFinite(options.now)) throw new Error('Invalid observation window')
  let data
  if (args.includes('--database')) {
    await import('dotenv/config')
    const { createClient } = await import('@supabase/supabase-js')
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase configuration is required')
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const from = new Date(options.now - options.days * 86_400_000).toISOString(), to = new Date(options.now).toISOString()
    const read = async (table, columns) => {
      const rows = []
      for (let start = 0; ; start += 1000) {
        const { data: page, error } = await db.from(table).select(columns).gte('created_at', from).lte('created_at', to).order('created_at').order('id').range(start, start + 999)
        if (error) throw new Error(`Could not read ${table}`)
        rows.push(...page)
        if (page.length < 1000) return rows
      }
    }
    data = { projects: await read('projects', 'id,status,created_at'), downloadEvents: await read('download_events', 'id,project_id,kind,created_at') }
  } else {
    const file = flag('input', '')
    if (!file) throw new Error('Use --input snapshot.json or --database')
    data = JSON.parse(await fs.readFile(file, 'utf8'))
  }
  console.log(JSON.stringify(summarizeDownloadFunnel(data, options), null, 2))
}
