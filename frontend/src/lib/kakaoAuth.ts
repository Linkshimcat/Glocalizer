const KAKAO_AUTHORIZE_URL = 'https://kauth.kakao.com/oauth/authorize'
const STATE_STORAGE_KEY = 'glocalizer:kakaoState'

function randomState(): string {
  return crypto.randomUUID()
}

export function kakaoRedirectUri(): string {
  return `${window.location.origin}/auth/kakao/callback`
}

/** 클라이언트 ID가 설정되지 않았으면 null을 반환해 호출부에서 안내 메시지를 띄우게 한다. */
export function buildKakaoAuthUrl(): string | null {
  const clientId = import.meta.env.VITE_KAKAO_CLIENT_ID
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
    redirect_uri: kakaoRedirectUri(),
    state,
  })
  return `${KAKAO_AUTHORIZE_URL}?${params.toString()}`
}

/** 콜백 페이지에서 돌아온 state가 우리가 보낸 값과 일치하는지 확인한다(CSRF 방지).
 *  카카오 토큰 교환 자체엔 state가 필요 없어 백엔드로는 보내지 않는다(redirectUri만 보냄). */
export function consumeKakaoState(receivedState: string): boolean {
  try {
    const expected = sessionStorage.getItem(STATE_STORAGE_KEY)
    sessionStorage.removeItem(STATE_STORAGE_KEY)
    return Boolean(expected) && expected === receivedState
  } catch {
    return false
  }
}
