import type { AnalyticsEvent, AnalyticsEventName, ExperimentGroup } from '../types/analytics'

/**
 * 본선 C-04 분석 이벤트 발송(README 6-3). 실패해도 화면 동작에 영향을 주지 않는 fire-and-forget이며,
 * 이미지·번역문·이메일·실명 같은 개인정보는 절대 담지 않는다. internal 여부는 서버가 계정으로 다시 판정한다.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'
const SESSION_ID_KEY = 'glocalizer:analyticsSessionId'

function anonymousSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY)
    if (existing) return existing
    const created = crypto.randomUUID()
    sessionStorage.setItem(SESSION_ID_KEY, created)
    return created
  } catch {
    // 저장소가 막힌 환경에서는 이벤트마다 새 ID — 세션 단위 집계만 부정확해진다.
    return crypto.randomUUID()
  }
}

/** 로컬 개발은 internal, Demo Lab은 demo, 나머지는 external. */
function defaultGroup(): ExperimentGroup {
  if (import.meta.env.DEV) return 'internal'
  return window.location.pathname.startsWith('/demo-lab') ? 'demo' : 'external'
}

function accountToken(): string | null {
  try { return localStorage.getItem('glocalizer:authToken') } catch { return null }
}

/**
 * 지금 열려 있는 클라우드 프로젝트 ID. 업로드 스토어(store/uploads.tsx)가 sessionStorage에
 * JSON으로 저장하는 'glocalizer:cloudProjectId'를 읽는다 — 공용 스토어를 고치지 않고 내보내기
 * 이벤트·QA 리포트에 프로젝트를 연결하기 위한 것이라, 키 이름이 바뀌면 여기도 함께 고친다.
 */
export function currentCloudProjectId(): string | null {
  try {
    const raw = sessionStorage.getItem('glocalizer:cloudProjectId')
    const value: unknown = raw ? JSON.parse(raw) : null
    return typeof value === 'string' && value ? value : null
  } catch {
    return null
  }
}

export function currentAccountToken(): string | null {
  return accountToken()
}

type EventFields = Partial<Pick<AnalyticsEvent, 'projectId' | 'durationMs' | 'imageCount' | 'experimentGroup'>>

export function trackEvent(eventName: AnalyticsEventName, fields: EventFields = {}): void {
  const event: AnalyticsEvent = {
    eventName,
    clientEventId: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    anonymousSessionId: anonymousSessionId(),
    experimentGroup: fields.experimentGroup ?? defaultGroup(),
    ...(fields.projectId ? { projectId: fields.projectId } : {}),
    ...(fields.durationMs !== undefined ? { durationMs: Math.max(0, Math.round(fields.durationMs)) } : {}),
    ...(fields.imageCount !== undefined ? { imageCount: fields.imageCount } : {}),
  }
  const token = accountToken()
  try {
    // keepalive: 다운로드 직후 결과 페이지로 이동해도 요청이 끊기지 않게 한다.
    void fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(event),
    }).catch(() => {})
  } catch {
    // fetch 자체가 없는 환경 — 무시
  }
}
