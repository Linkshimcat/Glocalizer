import { apiFetch, RequestError, responseFailure } from '../../lib/requestError'
import type { ExperimentGroup, ProofSummary } from '../../types/analytics'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'

function accountHeaders(): Record<string, string> {
  try {
    const token = localStorage.getItem('glocalizer:authToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

function groupQuery(groups: ExperimentGroup[]) {
  return new URLSearchParams({ groups: groups.join(',') }).toString()
}

async function ensureOk(response: Response, fallback: string) {
  if (response.ok) return
  const error = await responseFailure(response, fallback)
  throw new RequestError(error.message, error.status, error.code, error.retryAfterSeconds)
}

/** README 6-2 GET /proof/summary — 기본은 external만 집계한다. */
export async function fetchProofSummary(groups: ExperimentGroup[]): Promise<ProofSummary> {
  const response = await apiFetch(`${API_BASE_URL}/proof/summary?${groupQuery(groups)}`, { headers: accountHeaders() })
  await ensureOk(response, '측정값을 불러오지 못했어요.')
  return response.json() as Promise<ProofSummary>
}

/** README 6-2 GET /proof/export.csv — 개인정보 없는 필드만 내려온다. */
export async function fetchProofCsv(groups: ExperimentGroup[]): Promise<Blob> {
  const response = await apiFetch(`${API_BASE_URL}/proof/export.csv?${groupQuery(groups)}`, { headers: accountHeaders() })
  await ensureOk(response, '원자료를 내려받지 못했어요.')
  return response.blob()
}
