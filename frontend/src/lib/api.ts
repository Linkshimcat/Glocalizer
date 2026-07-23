const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

export interface ApiCandidate {
  text: string
  tone: string
  best?: boolean
}

export interface ApiRegion {
  id: string
  text: string
  confidence: number
  normalizedBox: { x: number; y: number; width: number; height: number } | null
  source: 'paddle-consensus' | 'vision-fallback'
  agreementScore: number
  needsManualReview: boolean
}

export interface ApiAssetResult {
  id: string
  name: string
  type: string
  width: number | null
  height: number | null
  status: string
  originalUrl: string | null
  cleanedUrl: string | null
  ocr: { fullText: string | null; primaryRegionId: string | null; regions: ApiRegion[] }
  localizations: Record<string, { candidates: ApiCandidate[]; recommendedStyle: { fontCategory?: string } | null }>
  cleanup: { method: string | null; quality: string | null; needsManualCleanup: boolean }
  needsManualOcrReview: boolean
  editorStates: Record<string, object>
  errorCode?: string
  errorMessage?: string
}

export interface ProjectResults {
  projectId: string
  status: string
  targetLanguages: string[]
  assets: ApiAssetResult[]
}

export interface ProjectStatus {
  projectId: string
  status: string
  stage: string | null
  progress: number
  message: string
  assets: Array<{ assetId: string; status: string; progress: number; errorCode?: string; errorMessage?: string }>
}

interface CreatedProject {
  projectId: string
  projectToken: string
  assets: Array<{ assetId: string; clientId: string; uploadUrl: string }>
}

interface ApiFailure {
  error?: { message?: string }
  message?: string
}

export class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { 'X-Project-Token': token } : {}),
      ...init.headers,
    },
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiFailure
    throw new ApiError(body.error?.message ?? body.message ?? '서버 요청에 실패했어요.')
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function createProject(files: File[], targetLanguages: string[]): Promise<CreatedProject> {
  return request<CreatedProject>('/projects', {
    method: 'POST',
    body: JSON.stringify({
      targetLanguages,
      options: { tone: 'funny', audience: 'teen', translationStyle: 'trendy', highQualityReview: false },
      files: files.map((file, index) => ({ clientId: String(index), name: file.name, mimeType: file.type, size: file.size })),
    }),
  })
}

export async function uploadToSignedUrl(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
  if (!response.ok) throw new ApiError('이미지 파일 업로드에 실패했어요.')
}

export async function completeUploads(projectId: string, token: string, assetIds: string[]): Promise<void> {
  await request(`/projects/${projectId}/uploads/complete`, { method: 'POST', body: JSON.stringify({ assetIds }) }, token)
}

export async function startProject(projectId: string, token: string): Promise<void> {
  await request(`/projects/${projectId}/process`, { method: 'POST' }, token)
}

export function getProjectStatus(projectId: string, token: string): Promise<ProjectStatus> {
  return request(`/projects/${projectId}/status`, {}, token)
}

export function getProjectResults(projectId: string, token: string): Promise<ProjectResults> {
  return request(`/projects/${projectId}/results`, {}, token)
}

export async function reviseOcr(projectId: string, token: string, assetId: string, text: string, normalizedBox: { x: number; y: number; width: number; height: number }): Promise<void> {
  await request(`/projects/${projectId}/assets/${assetId}/ocr`, { method: 'PATCH', body: JSON.stringify({ text, normalizedBox }) }, token)
}

export async function saveEditorState(
  projectId: string,
  token: string,
  assetId: string,
  regionId: string,
  languageCode: string,
  style: object,
): Promise<void> {
  await request(`/projects/${projectId}/assets/${assetId}/editor-state`, {
    method: 'PUT',
    body: JSON.stringify({ regionId, languageCode, style }),
  }, token)
}
