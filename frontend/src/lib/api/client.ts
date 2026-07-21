import type { CreateProjectRequest, CreateProjectResponse, ProjectResultsResponse, ProjectSession, ProjectStatusResponse } from './types'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:3000/api/v1'

export class ApiError extends Error {
  readonly code?: string
  readonly status?: number

  constructor(message: string, code?: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}, session?: ProjectSession): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  if (session) headers.set('X-Project-Token', session.projectToken)
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  if (response.status === 204) return undefined as T
  const body = await response.json().catch(() => null) as { error?: { message?: string; code?: string } } | T | null
  if (!response.ok) {
    const error = body as { error?: { message?: string; code?: string } } | null
    throw new ApiError(error?.error?.message ?? '요청을 처리하지 못했어요.', error?.error?.code, response.status)
  }
  return body as T
}

export const api = {
  createProject: (input: CreateProjectRequest) => request<CreateProjectResponse>('/projects', { method: 'POST', body: JSON.stringify(input) }),
  completeUploads: (session: ProjectSession, assetIds: string[]) => request<{ assets: Array<{ assetId: string; status: string; errorMessage?: string }> }>(`/projects/${session.projectId}/uploads/complete`, { method: 'POST', body: JSON.stringify({ assetIds }) }, session),
  startProcessing: (session: ProjectSession) => request<{ jobId: string; status: string }>(`/projects/${session.projectId}/process`, { method: 'POST' }, session),
  getStatus: (session: ProjectSession) => request<ProjectStatusResponse>(`/projects/${session.projectId}/status`, {}, session),
  getResults: (session: ProjectSession) => request<ProjectResultsResponse>(`/projects/${session.projectId}/results`, {}, session),
  saveEditorState: (session: ProjectSession, assetId: string, regionId: string, languageCode: string, style: Record<string, unknown>) => request<void>(`/projects/${session.projectId}/assets/${assetId}/editor-state`, { method: 'PUT', body: JSON.stringify({ regionId, languageCode, style }) }, session),
  regenerate: (session: ProjectSession, assetId: string, regionId: string, languageCode: string) => request<unknown>(`/projects/${session.projectId}/assets/${assetId}/regenerate`, { method: 'POST', body: JSON.stringify({ regionId, languageCode }) }, session),
}

export async function uploadToSignedUrl(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
  if (!response.ok) throw new ApiError('이미지 업로드에 실패했어요.', undefined, response.status)
}
