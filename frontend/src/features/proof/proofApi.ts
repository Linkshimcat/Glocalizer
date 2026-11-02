import { apiFetch, RequestError, responseFailure } from '../../lib/requestError'
import type { ExperimentGroup, ProofSummary } from '../../types/analytics'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

// 공개 범위(PR #215): external 집계는 키 없이 공개, internal·demo 집계와 원자료 CSV는 관리자 키(X-Admin-Key).
// 키를 보냈는데 틀리면 external이어도 401이므로, 키가 없을 때는 헤더 자체를 보내지 않는다.
async function proofRequest(path: string, group: ExperimentGroup, adminKey: string | null, fallback: string): Promise<Response> {
  const response = await apiFetch(`${API_BASE_URL}${path}?${new URLSearchParams({ group })}`, { headers: adminKey ? { 'X-Admin-Key': adminKey } : {} })
  if (!response.ok) {
    const error = await responseFailure(response, fallback)
    throw new RequestError(error.message, error.status, error.code, error.retryAfterSeconds)
  }
  return response
}

/** GET /proof/summary — 한 번에 한 그룹만 집계한다. */
/** 키 없는 external 요청은 서버가 1분 캐시하고 IP당 분당 30회로 제한한다. 키를 보내면 항상 새로 계산한다. */
export async function fetchProofSummary(group: ExperimentGroup, adminKey: string | null): Promise<ProofSummary> {
  return (await proofRequest('/proof/summary', group, adminKey, '측정값을 불러오지 못했어요.')).json() as Promise<ProofSummary>
}

/** GET /proof/export.csv — 개인정보 없는 필드만 내려온다. */
export async function fetchProofCsv(group: ExperimentGroup, adminKey: string): Promise<Blob> {
  return (await proofRequest('/proof/export.csv', group, adminKey, '원자료를 내려받지 못했어요.')).blob()
}
