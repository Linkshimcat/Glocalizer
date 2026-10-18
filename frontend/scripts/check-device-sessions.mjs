import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const base = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5173'
const shots = process.env.SHOT_DIR
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined })
const user = { id: 'fixture-user', email: 'fixture@example.invalid', name: 'Fixture', avatarUrl: null, signupMethod: 'google', hasPassword: false }
const now = Date.now()
const row = (id, patch = {}) => ({ id, deviceLabel: 'Chrome · macOS', ipMasked: '203.0.113.x', loginMethod: 'google', createdAt: new Date(now - 864e5).toISOString(), lastSeenAt: new Date(now - 5 * 6e4).toISOString(), current: false, ...patch })

async function open({ lang = 'ko', theme, width = 1280, sessions, onRequest }) {
  const context = await browser.newContext({ viewport: { width, height: 1100 } })
  await context.addInitScript(([lang, theme, user]) => {
    localStorage.setItem('glocalizer:siteLang', lang)
    if (theme) localStorage.setItem('glocalizer:theme', theme)
    localStorage.setItem('glocalizer:authToken', 'old-token')
    localStorage.setItem('glocalizer:authUser', JSON.stringify(user))
  }, [lang, theme, user])
  const calls = []
  await context.route('https://**/*', route => route.abort())
  await context.route('**/api/v1/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname.replace('/api/v1', '')
    calls.push(`${req.method()} ${path}`)
    const custom = await onRequest?.(route, path, req)
    if (custom) return
    if (path === '/auth/sessions' && req.method() === 'GET') return route.fulfill({ json: { sessions: sessions() } })
    if (path === '/auth/me') return route.fulfill({ json: { user } })
    return route.fulfill({ json: { projects: [], showcases: [] } })
  })
  const page = await context.newPage()
  await page.goto(base + '/account', { waitUntil: 'networkidle' })
  return { context, page, calls }
}

try {
  // 개별 로그아웃 + 다른 기기 모두 로그아웃
  {
    let list = [row('a', { current: true }), row('b', { deviceLabel: 'Safari · iOS', lastSeenAt: new Date(now - 3 * 36e5).toISOString() }), row('c', { deviceLabel: null, ipMasked: null })]
    const { context, page, calls } = await open({
      sessions: () => list,
      onRequest: async (route, path, req) => {
        if (path === '/auth/sessions/b' && req.method() === 'DELETE') { list = list.filter(s => s.id !== 'b'); await route.fulfill({ json: { success: true } }); return true }
        if (path === '/auth/sessions/revoke-others' && req.method() === 'POST') {
          assert.equal(req.headers().authorization, 'Bearer old-token')
          list = list.filter(s => s.current)
          await route.fulfill({ json: { token: 'new-token', user } }); return true
        }
      },
    })
    const section = page.getByRole('region', { name: '로그인된 기기' })
    await section.waitFor()
    assert.equal(await section.getByText('이 기기', { exact: true }).count(), 1)
    assert.ok(await section.getByText('Chrome · macOS').count() >= 1)
    assert.equal(await section.getByText('알 수 없는 기기').count(), 1)
    assert.ok(await section.getByText('203.0.113.x', { exact: false }).count() >= 1)
    assert.equal(await section.getByRole('button', { name: '로그아웃', exact: true }).count(), 2, 'current device has no per-row sign-out')
    if (shots) await page.screenshot({ path: `${shots}/devices-ko.png`, fullPage: true })

    await section.locator('li', { hasText: 'Safari · iOS' }).getByRole('button', { name: '로그아웃', exact: true }).click()
    await section.getByText('Safari · iOS').waitFor({ state: 'detached' })
    assert.ok(calls.includes('DELETE /auth/sessions/b'))

    await section.getByRole('button', { name: '다른 기기 모두 로그아웃' }).click()
    await section.getByText('이 기기를 뺀 모든 기기에서 로그아웃돼요.').waitFor()
    await section.getByRole('button', { name: '로그아웃하기' }).click()
    await page.waitForFunction(() => localStorage.getItem('glocalizer:authToken') === 'new-token')
    await section.getByRole('button', { name: '다른 기기 모두 로그아웃' }).waitFor({ state: 'detached' })
    assert.equal(new URL(page.url()).pathname, '/account', 'still signed in on this device')
    await context.close()
  }

  // 이전 방식 토큰(legacy)
  {
    const { context, page } = await open({ sessions: () => [row('legacy', { current: true, legacy: true })] })
    const section = page.getByRole('region', { name: '로그인된 기기' })
    await section.getByText('이전 방식으로 로그인한 기기', { exact: true }).waitFor()
    await section.getByText('이전 방식으로 로그인한 다른 기기는 목록에 보이지 않을 수 있어요', { exact: false }).waitFor()
    await section.getByRole('button', { name: '다른 기기 모두 로그아웃' }).waitFor()
    await context.close()
  }

  // 목록 로딩 실패 → 다시 시도
  {
    let fail = true
    const { context, page } = await open({ sessions: () => [row('a', { current: true })], onRequest: async (route, path) => { if (path === '/auth/sessions' && fail) { fail = false; await route.fulfill({ status: 500, json: { error: { message: 'boom' } } }); return true } } })
    const section = page.getByRole('region', { name: '로그인된 기기' })
    await section.getByText('기기 목록을 불러오지 못했어요.').waitFor()
    await section.getByRole('button', { name: '다시 시도' }).click()
    await section.getByText('이 기기', { exact: true }).waitFor()
    await context.close()
  }

  // 언어·다크·모바일 화면
  for (const [lang, theme, width, title] of [['en', undefined, 1280, 'Signed-in devices'], ['ja', 'dark', 1280, 'ログイン中の端末'], ['zh', undefined, 390, '已登录的设备'], ['ko', 'dark', 390, '로그인된 기기']]) {
    const { context, page } = await open({ lang, theme, width, sessions: () => [row('a', { current: true }), row('b', { deviceLabel: 'Safari · iOS' })] })
    const section = page.getByRole('region', { name: title })
    await section.waitFor()
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `no horizontal overflow ${lang} ${width}`)
    if (shots) { await section.scrollIntoViewIfNeeded(); await section.screenshot({ path: `${shots}/devices-${lang}-${theme ?? 'light'}-${width}.png` }) }
    await context.close()
  }

  console.log('PASS: device list, per-device sign-out, sign out others (token swap), legacy entry, retry, 4 languages.')
} finally { await browser.close() }
