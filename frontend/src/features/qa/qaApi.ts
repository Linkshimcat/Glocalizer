import { apiFetch, RequestError, responseFailure } from '../../lib/requestError'
import type { QaProjectResponse, QaReport } from '../../types/qa'

// lib/api.ts는 여러 사람이 함께 고치는 파일이라, QA 호출은 이 기능 폴더 안에 따로 둔다.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

/** README 6-2 QA API. 계정 로그인(Authorization)과 프로젝트 토큰을 함께 보낸다. */
async function qaRequest<T>(path: string, accountToken: string | null, projectToken: string | null, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(accountToken ? { Authorization: `Bearer ${accountToken}` } : {}),
      ...(projectToken ? { 'X-Project-Token': projectToken } : {}),
    },
  })
  if (!response.ok) {
    const error = await responseFailure(response, '검사 요청에 실패했어요.')
    throw new RequestError(error.message, error.status, error.code, error.retryAfterSeconds)
  }
  return response.json() as Promise<T>
}

export function fetchQaProject(projectId: string, accountToken: string | null, projectToken: string | null): Promise<QaProjectResponse> {
  return qaRequest(`/projects/${encodeURIComponent(projectId)}/qa`, accountToken, projectToken)
}

/** assetId를 빼면 프로젝트 전체를 검사한다. */
export function runQaInspect(projectId: string, accountToken: string | null, projectToken: string | null, assetId?: string): Promise<QaReport> {
  return qaRequest(`/projects/${encodeURIComponent(projectId)}/qa/inspect`, accountToken, projectToken, {
    method: 'POST',
    body: JSON.stringify(assetId ? { assetId } : {}),
  })
}
