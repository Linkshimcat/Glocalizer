import { apiFetch, RequestError, responseFailure } from '../../lib/requestError'
import type { ExperimentGroup, ProofSummary } from '../../types/analytics'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

// 공개 범위가 정해지기 전까지 서버가 관리자 키(X-Admin-Key)로 막아 둔다(다운로드 집계와 같은 키).
async function proofRequest(path: string, group: ExperimentGroup, adminKey: string, fallback: string): Promise<Response> {
  const response = await apiFetch(`${API_BASE_URL}${path}?${new URLSearchParams({ group })}`, { headers: { 'X-Admin-Key': adminKey } })
  if (!response.ok) {
    const error = await responseFailure(response, fallback)
    throw new RequestError(error.message, error.status, error.code, error.retryAfterSeconds)
  }
  return response
}

/** GET /proof/summary — 한 번에 한 그룹만 집계한다. */
export async function fetchProofSummary(group: ExperimentGroup, adminKey: string): Promise<ProofSummary> {
  return (await proofRequest('/proof/summary', group, adminKey, '측정값을 불러오지 못했어요.')).json() as Promise<ProofSummary>
}

/** GET /proof/export.csv — 개인정보 없는 필드만 내려온다. */
export async function fetchProofCsv(group: ExperimentGroup, adminKey: string): Promise<Blob> {
  return (await proofRequest('/proof/export.csv', group, adminKey, '원자료를 내려받지 못했어요.')).blob()
}
