import type { ProofSummary } from '../../types/analytics'

/**
 * 백엔드 /proof/summary(윤재) 전 화면 개발용 목업. 개발 서버에서 `/proof?mock=1`일 때만 쓰고 배너를 띄운다.
 * 번역 단계를 null로 둬서 "측정 안 됨" 표시를 같이 확인한다. 발표·문서에 이 숫자를 쓰지 않는다.
 */
export const MOCK_PROOF_SUMMARY: ProofSummary = {
  groups: ['external'],
  periodStart: '2026-10-20T00:00:00.000Z',
  periodEnd: '2026-10-28T00:00:00.000Z',
  sampleCount: 42,
  completionRate: 0.38,
  stages: {
    ocr: { p50Ms: 2100, p95Ms: 6400, sampleCount: 40 },
    translation: { p50Ms: null, p95Ms: null, sampleCount: 0 },
    cleanup: { p50Ms: 850, p95Ms: 3100, sampleCount: 38 },
    total: { p50Ms: 9800, p95Ms: 24500, sampleCount: 36 },
  },
}
