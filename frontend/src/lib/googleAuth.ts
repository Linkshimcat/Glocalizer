import type { SupabaseClient } from '@supabase/supabase-js'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            nonce?: string
            use_fedcm_for_prompt?: boolean
          }) => void
          renderButton: (parent: HTMLElement, options: { type: 'standard' }) => void
        }
      }
    }
  }
}

let clientPromise: Promise<SupabaseClient | null> | undefined

function googleAuthClient(): Promise<SupabaseClient | null> {
  if (clientPromise) return clientPromise
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  clientPromise = url && key
    ? import('@supabase/supabase-js').then(({ createClient }) =>
        createClient(url, key, {
          auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
        }),
      )
    : Promise.resolve(null)
  return clientPromise
}

let gsiScriptPromise: Promise<void> | undefined

function loadGoogleIdentityScript(): Promise<void> {
  if (gsiScriptPromise) return gsiScriptPromise
  gsiScriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      gsiScriptPromise = undefined
      script.remove()
      reject(new Error('Google 로그인 스크립트를 불러오지 못했어요.'))
    }
    document.head.appendChild(script)
  })
  return gsiScriptPromise
}

// Google에는 해시된 nonce를 보내고, Supabase에는 원본 nonce를 보내 재전송 공격을 막는다.
async function generateNonce(): Promise<[string, string]> {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(nonce))
  const hashedNonce = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
  return [nonce, hashedNonce]
}

// renderButton()은 호출이 끝났다고 버튼이 바로 클릭 가능한 게 아니라, 내부적으로 iframe을
// 비동기로 불러와 그린다. 이 완료를 기다리지 않으면 로그인 페이지 진입 직후 빠르게 클릭했을 때
// (특히 콜드 캐시) div[role="button"]이 아직 없어 "설정 안 됨"으로 잘못 실패한다.
function waitForRenderedButton(container: HTMLElement, timeoutMs = 8000): Promise<void> {
  if (container.querySelector('div[role="button"]')) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      observer.disconnect()
      reject(new Error('Google 로그인 준비 시간이 초과됐어요. 다시 시도해주세요.'))
    }, timeoutMs)
    const observer = new MutationObserver(() => {
      if (container.querySelector('div[role="button"]')) {
        observer.disconnect()
        clearTimeout(timer)
        resolve()
      }
    })
    observer.observe(container, { childList: true, subtree: true })
  })
}

function ensureHiddenButtonContainer(): HTMLElement {
  let container = document.getElementById('google-gsi-hidden-button')
  if (!container) {
    container = document.createElement('div')
    container.id = 'google-gsi-hidden-button'
    container.style.position = 'fixed'
    container.style.top = '-9999px'
    container.style.left = '-9999px'
    document.body.appendChild(container)
  }
  return container
}

interface PendingLogin {
  resolve: (accessToken: string) => void
  reject: (err: unknown) => void
}

let pendingLogin: PendingLogin | null = null
let preparePromise: Promise<boolean> | undefined

// 클릭 시점에 async 작업이 끼면 iOS Safari 등 모바일 브라우저가 팝업을 진짜 사용자 제스처로
// 인정하지 않아 로그인 후 원래 창으로 결과가 돌아오지 못하고 빈 화면만 남는다.
// 그래서 스크립트 로딩·초기화 같은 무거운 준비는 버튼을 누르기 전에 미리 끝내둔다.
function prepareGoogleLogin(): Promise<boolean> {
  if (preparePromise) return preparePromise
  const attempt = (async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const supabase = await googleAuthClient()
    if (!supabase || !clientId) return false

    await loadGoogleIdentityScript()
    const [nonce, hashedNonce] = await generateNonce()

    window.google!.accounts.id.initialize({
      client_id: clientId,
      nonce: hashedNonce,
      use_fedcm_for_prompt: true,
      callback: (response) => {
        const current = pendingLogin
        pendingLogin = null
        if (!current) return
        supabase.auth
          .signInWithIdToken({ provider: 'google', token: response.credential, nonce })
          .then(({ data, error }) => {
            if (error || !data.session?.access_token) {
              current.reject(error ?? new Error('Google 로그인 세션을 확인할 수 없어요.'))
              return
            }
            current.resolve(data.session.access_token)
          })
          .catch(current.reject)
      },
    })

    const container = ensureHiddenButtonContainer()
    container.innerHTML = ''
    window.google!.accounts.id.renderButton(container, { type: 'standard' })
    await waitForRenderedButton(container)

    return true
  })()
  preparePromise = attempt
  attempt.catch(() => {
    if (preparePromise === attempt) preparePromise = undefined
  })
  return attempt
}

// 로그인 페이지 진입 시 미리 호출해두면 버튼 클릭 시점엔 팝업만 즉시 열면 되어 모바일에서도 안전하다.
export function preloadGoogleLogin(): Promise<boolean> {
  return prepareGoogleLogin()
}

// Google Identity Services로 ID 토큰을 직접 받아 Supabase 세션을 발급받는다.
// signInWithOAuth 리다이렉트 방식과 달리 Supabase 콜백 도메인을 거치지 않아 우리 서비스 도메인만 노출된다.
export async function startGoogleLogin(): Promise<string | false> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) return false

  const ready = await prepareGoogleLogin()
  if (!ready) return false

  const container = document.getElementById('google-gsi-hidden-button')
  const button = container?.querySelector<HTMLElement>('div[role="button"]')
  if (!button) return false

  return new Promise((resolve, reject) => {
    let sawWindowBlur = false
    let focusTimer: ReturnType<typeof setTimeout> | undefined

    const cleanup = () => {
      window.removeEventListener('blur', onWindowBlur)
      window.removeEventListener('focus', onWindowFocus)
      if (focusTimer) clearTimeout(focusTimer)
      clearTimeout(loginTimeout)
    }
    const current: PendingLogin = {
      resolve: (accessToken) => {
        cleanup()
        resolve(accessToken)
      },
      reject: (error) => {
        cleanup()
        reject(error)
      },
    }
    const cancelIfPending = (message: string) => {
      if (pendingLogin !== current) return
      pendingLogin = null
      current.reject(new Error(message))
    }
    function onWindowBlur() {
      sawWindowBlur = true
    }
    function onWindowFocus() {
      if (!sawWindowBlur) return
      // Google credential callback과 창 focus 이벤트의 순서는 브라우저마다 다르다.
      // 성공 callback에 먼저 처리할 짧은 여유를 준 뒤, 응답이 없으면 팝업을 닫은 것으로 본다.
      focusTimer = setTimeout(() => {
        cancelIfPending('Google 로그인이 취소됐어요. 다시 시도해주세요.')
      }, 500)
    }

    const loginTimeout = setTimeout(() => {
      cancelIfPending('Google 로그인 응답 시간이 초과됐어요. 다시 시도해주세요.')
    }, 2 * 60 * 1000)

    window.addEventListener('blur', onWindowBlur)
    window.addEventListener('focus', onWindowFocus)
    pendingLogin = current
    button.click()
  })
}
