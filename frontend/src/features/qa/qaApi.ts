import { apiFetch, RequestError, responseFailure } from '../../lib/requestError'
import type { QaProjectResponse, QaReport } from '../../types/qa'

// lib/api.ts는 여러 사람이 함께 고치는 파일이라, QA 호출은 이 기능 폴더 안에 따로 둔다.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

/** README 6-2 QA API. 계정 로그인(Authorization)과 프로젝트 토큰을 함께 보낸다. */
async function qaRequest<T>(path: string, accountToken: string | null, projectToken: string | null, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      // FormData는 브라우저가 boundary를 붙여 Content-Type을 직접 정한다 — 여기서 지정하면 multipart 파싱이 깨진다.
      ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
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

/**
 * 검사를 실행한다. pngs는 assetId → 브라우저가 만든 최종 PNG이고, 서버는 PNG를 받은 이미지만 규격(SPEC_*)을
 * 판정한다(받지 않으면 "측정 안 함"). 필드 이름 = assetId, 같은 이미지를 두 번 보내면 서버가 거절한다.
 * assetId를 주면 그 이미지 기준으로 passed를 계산한다(에디터 재검사).
 */
export function runQaInspect(
  projectId: string,
  accountToken: string | null,
  projectToken: string | null,
  pngs: Map<string, Blob>,
  assetId?: string,
): Promise<QaReport> {
  const body = new FormData()
  if (assetId) body.append('assetId', assetId)
  for (const [id, png] of pngs) body.append(id, png, `${id}.png`)
  return qaRequest(`/projects/${encodeURIComponent(projectId)}/qa/inspect`, accountToken, projectToken, { method: 'POST', body })
}
