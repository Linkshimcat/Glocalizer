import type { CloudProject } from './api'
import type { GenerationProject } from './generationApi'

export type ProjectKind = 'localization' | 'generation'
export type LibraryStatus = 'draft' | 'running' | 'editing' | 'completed' | 'attention'
export interface LibraryProject {
  key: string
  id: string
  kind: ProjectKind
  name: string
  searchText: string
  createdAt: string
  archived: boolean
  status: LibraryStatus
  needsAttention: boolean
  imageCount: number
  source: CloudProject | GenerationProject
}

export function libraryProjects(localized: CloudProject[], generated: GenerationProject[]): LibraryProject[] {
  return [
    ...localized.filter(project => project.imageCount > 0).map((project): LibraryProject => ({
      key: `localization:${project.id}`, id: project.id, kind: 'localization', name: project.name || project.id.slice(0, 8), searchText: project.name || project.id.slice(0, 8), createdAt: project.createdAt, archived: project.resultReady,
      status: project.resultReady ? 'completed' : project.status === 'processing' ? 'running' : project.status === 'created' ? 'draft' : ['failed', 'expired'].includes(project.status) ? 'attention' : 'editing',
      needsAttention: ['failed', 'expired'].includes(project.status), imageCount: project.imageCount, source: project,
    })),
    ...generated.map((project): LibraryProject => {
      // Retries replace earlier attempts for a slot. Historical failures are not active warnings.
      const latest = new Map(project.images.map(image => [image.slot, image]))
      const running = [...latest.values()].some(image => ['queued', 'running'].includes(image.status))
      const failed = [...latest.values()].some(image => image.status === 'failed')
      const completed = new Set(project.images.filter(image => image.status === 'completed').map(image => image.slot)).size
      const archived = (project.status ?? (completed === 24 ? 'completed' : 'active')) === 'completed'
      return {
        key: `generation:${project.id}`, id: project.id, kind: 'generation', name: project.name || project.prompt || project.id.slice(0, 8), searchText: `${project.name ?? ''} ${project.prompt}`, createdAt: project.created_at, archived,
        status: archived ? 'completed' : running ? 'running' : failed ? 'attention' : project.images.length ? 'editing' : 'draft', needsAttention: failed, imageCount: completed, source: project,
      }
    }),
  ]
}

export function filterProjects(projects: LibraryProject[], options: { archive: boolean; q: string; kind: string; status: string; sort: string }, locale: string): LibraryProject[] {
  const query = options.q.trim().toLocaleLowerCase(locale)
  return projects.filter(project => project.archived === options.archive &&
    (!query || project.searchText.toLocaleLowerCase(locale).includes(query)) &&
    (options.kind === 'all' || project.kind === options.kind) &&
    (options.status === 'all' || (options.status === 'attention' ? project.needsAttention : project.status === options.status)))
    .sort((a, b) => {
      if (options.sort === 'name') return a.name.localeCompare(b.name, locale) || a.key.localeCompare(b.key)
      const delta = (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)
      return (options.sort === 'oldest' ? -delta : delta) || a.key.localeCompare(b.key)
    })
}
