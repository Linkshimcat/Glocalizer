import type { ProofSummary } from '../../types/analytics'

/**
 * 화면 개발용 목업. 개발 서버에서 `/proof?mock=1`일 때만 쓰고 "목업" 배너를 띄운다.
 * export_failed를 null로 둬서 "측정 안 됨" 표시를 같이 확인한다. 발표·문서에 이 숫자를 쓰지 않는다.
 */
export const MOCK_PROOF_SUMMARY: ProofSummary = {
  experimentGroup: 'external',
  period: { from: '2026-10-20T01:00:00.000Z', to: '2026-10-28T09:30:00.000Z' },
  sampleSize: 17,
  eventCounts: { demo_started: 3, localization_started: 21, localization_completed: 19, qa_reviewed: 8, export_succeeded: 8, export_failed: 0 },
  completion: { startedProjects: 21, exportedProjects: 8, rate: 8 / 21 },
  durations: {
    demo_started: null,
    localization_started: null,
    localization_completed: { n: 19, p50Ms: 41200, p95Ms: 118600 },
    qa_reviewed: null,
    export_succeeded: { n: 8, p50Ms: 2300, p95Ms: 5100 },
    export_failed: null,
  },
}
