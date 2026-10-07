const KEY = 'glocalizer:loginReturnTo'
const PATHS = new Set(['/dashboard', '/localize', '/generate', '/editor', '/result', '/review', '/archive', '/account'])

/** Only same-origin workspace routes may be used as OAuth return destinations. */
export function safeLoginReturn(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/dashboard'
  try {
    const url = new URL(value, window.location.origin)
    return url.origin === window.location.origin && PATHS.has(url.pathname) ? `${url.pathname}${url.search}${url.hash}` : '/dashboard'
  } catch { return '/dashboard' }
}

export function rememberLoginReturn(value: string) {
  try { sessionStorage.setItem(KEY, safeLoginReturn(value)) } catch { /* OAuth can still proceed when storage is unavailable. */ }
}

export function consumeLoginReturn(): string {
  try {
    const value = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    return safeLoginReturn(value)
  } catch { return '/dashboard' }
}
