const NAVER_AUTHORIZE_URL = 'https://nid.naver.com/oauth2.0/authorize'
const STATE_STORAGE_KEY = 'glocalizer:naverState'

function randomState(): string {
  return crypto.randomUUID()
}

export function naverRedirectUri(): string {
  return `${window.location.origin}/auth/naver/callback`
}

/** 클라이언트 ID가 설정되지 않았으면 null을 반환해 호출부에서 안내 메시지를 띄우게 한다. */
export function buildNaverAuthUrl(): string | null {
  const clientId = import.meta.env.VITE_NAVER_CLIENT_ID
  if (!clientId) return null

  const state = randomState()
  try {
    sessionStorage.setItem(STATE_STORAGE_KEY, state)
  } catch {
    // sessionStorage 접근이 막힌 환경에서도 로그인 시도 자체는 계속 진행한다.
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: naverRedirectUri(),
    state,
  })
  return `${NAVER_AUTHORIZE_URL}?${params.toString()}`
}

/** 콜백 페이지에서 돌아온 state가 우리가 보낸 값과 일치하는지 확인한다(CSRF 방지). */
export function consumeNaverState(receivedState: string): boolean {
  try {
    const expected = sessionStorage.getItem(STATE_STORAGE_KEY)
    sessionStorage.removeItem(STATE_STORAGE_KEY)
    return Boolean(expected) && expected === receivedState
  } catch {
    return false
  }
}
