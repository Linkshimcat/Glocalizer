import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const frontend = fileURLToPath(new URL('../', import.meta.url))
const base = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5173'
const fixturePort = Number(process.env.LOGIN_QA_PORT ?? 5175)
const fixtureBase = `http://127.0.0.1:${fixturePort}`
const output = process.env.LOGIN_QA_OUTPUT ?? '/tmp/glocalizer-login-redesign'
const user = { id: 'login-fixture-user', email: 'creator@example.test', name: 'Creator', avatarUrl: null, signupMethod: 'email' }
const errors = []
const layouts = []
const viewportFits = []
const checks = []
const labels = {
  ko: ['로그인', '회원가입', '비밀번호 표시', '비밀번호 숨기기'],
  en: ['Log in', 'Sign up', 'Show password', 'Hide password'],
  ja: ['ログイン', '新規登録', 'パスワードを表示', 'パスワードを非表示'],
  zh: ['登录', '注册', '显示密码', '隐藏密码'],
}

// This isolated Vite process uses only fake public configuration. Browser routes below
// simulate GIS, Supabase and our API; no real account or external OAuth request is used.
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(fixturePort), '--strictPort'], {
  cwd: frontend,
  env: {
    ...process.env,
    VITE_API_BASE_URL: 'http://127.0.0.1:5999/api/v1',
    VITE_GOOGLE_CLIENT_ID: 'login-fixture.apps.googleusercontent.com',
    VITE_NAVER_CLIENT_ID: 'login-fixture-naver',
    VITE_SUPABASE_URL: 'https://login-fixture.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_login_fixture',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let serverLog = ''
server.stdout.on('data', chunk => { serverLog = (serverLog + chunk).slice(-3000) })
server.stderr.on('data', chunk => { serverLog = (serverLog + chunk).slice(-3000) })
let browser

const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }
const jwt = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.fixture`

async function setup({ width = 390, height = 844, lang = 'ko', signedIn = false, me = 200, googleDelay = 0, reducedMotion = 'no-preference' } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 768, isMobile: width < 768, reducedMotion })
  const state = { requests: [], exchanges: [], me, failure: null, gate: null }
  await context.addInitScript(({ user, lang, signedIn, googleDelay }) => {
    localStorage.setItem('glocalizer:siteLang', lang)
    if (signedIn) {
      localStorage.setItem('glocalizer:authToken', 'login-fixture-token')
      localStorage.setItem('glocalizer:authUser', JSON.stringify(user))
    }
    window.google = { accounts: { id: {
      initialize(config) { window.__googleFixture = config },
      renderButton(container) {
        setTimeout(() => {
          const button = document.createElement('div')
          button.setAttribute('role', 'button')
          button.onclick = () => window.__googleFixture.callback({ credential: 'fixture-google-id-token' })
          container.appendChild(button)
        }, googleDelay)
      },
    } } }
  }, { user, lang, signedIn, googleDelay })
  await context.route('https://**/*', route => route.abort())
  await context.route('**/api/v1/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
    const reply = (json, status = 200) => route.fulfill({ json, status, headers: cors })
    if (request.method() === 'OPTIONS') return reply({})
    if (path === '/auth/me') return reply(state.me === 200 ? { user } : { error: { message: 'Session unavailable' } }, state.me)
    if (['/auth/login', '/auth/signup', '/auth/google', '/auth/naver/callback'].includes(path)) {
      state.requests.push({ path, body: request.postDataJSON() })
      if (state.gate) await state.gate.promise
      if (state.failure) return reply({ error: { message: state.failure.message } }, state.failure.status)
      return reply({ token: 'login-fixture-token', user })
    }
    if (path === '/projects' || path === '/generation/projects') return reply({ projects: [] })
    if (path === '/generation/config') return reply({ enabled: true })
    if (path === '/landing/showcases') return reply({ showcases: [] })
    if (path === '/ogq/stickers') return reply({ stickers: [] })
    return reply({})
  })
  await context.route('**/auth/v1/token**', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ json: {}, headers: cors })
    state.exchanges.push(route.request().postDataJSON())
    return route.fulfill({ headers: cors, json: { access_token: jwt, refresh_token: 'fixture-refresh-token', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user } })
  })
  await context.route('https://nid.naver.com/oauth2.0/authorize**', route => route.fulfill({ contentType: 'text/html', body: '<title>Naver authorization fixture</title>' }))
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  return { context, page, state }
}

function hold(state) {
  let release
  state.gate = { promise: new Promise(resolve => { release = resolve }) }
  return release
}

async function geometry(page, label) {
  const sizes = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, height: innerHeight }))
  const card = await page.locator('.login-panel').boundingBox()
  assert.ok(sizes.scroll <= sizes.width + 1, `${label}: horizontal overflow`)
  assert.ok(Math.abs(card.x + card.width / 2 - sizes.width / 2) < 1, `${label}: card must be centered`)
  assert.equal(await page.locator('header').count(), 1)
  assert.equal(await page.locator('main#main-content').count(), 1)
  assert.equal(await page.locator('.auth-backdrop[aria-hidden="true"][inert]').count(), 1)
  assert.equal(await page.locator('.auth-backdrop').evaluate(node => getComputedStyle(node).pointerEvents), 'none')
  for (const input of await page.locator('.login-panel input').all()) {
    // 체크박스는 18px 칸이 아니라 문구를 포함한 라벨 전체가 누르는 영역이다.
    const checkbox = (await input.getAttribute('type')) === 'checkbox'
    const target = checkbox ? await input.locator('xpath=ancestor::label').boundingBox() : await input.boundingBox()
    assert.ok(target.height >= (checkbox ? 44 : 48), `${label}: touch target too small`)
    assert.ok(await input.evaluate(node => node.labels?.length))
  }
  const uncovered = await page.locator('.login-panel input').first().evaluate(node => {
    const rect = node.getBoundingClientRect()
    return rect.top >= 0 && rect.top < innerHeight ? document.elementFromPoint(rect.x + 16, rect.y + rect.height / 2) === node : true
  })
  assert.equal(uncovered, true, `${label}: artwork must not cover inputs`)
  assert.equal(await page.locator('.login-panel button').evaluateAll(nodes => nodes.every(node => node.getBoundingClientRect().height >= 44)), true)
  const overlaps = await page.locator('.auth-greeting').evaluateAll(nodes => {
    const card = document.querySelector('.login-panel').getBoundingClientRect()
    return nodes.filter(node => {
      if (getComputedStyle(node).display === 'none') return false
      const r = node.getBoundingClientRect()
      return r.left < card.right && r.right > card.left && r.top < card.bottom && r.bottom > card.top
    }).length
  })
  assert.equal(overlaps, 0, `${label}: greeting overlap`)
  return { ...sizes, card }
}

try {
  let ready = false
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Fixture server failed: ${serverLog}`)
    try { if ((await fetch(fixtureBase, { signal: AbortSignal.timeout(500) })).ok) { ready = true; break } } catch { /* wait for Vite */ }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  assert.ok(ready, `Fixture server did not start: ${serverLog}`)
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined })
  await mkdir(output, { recursive: true })

  for (const [width, height] of [[320, 740], [390, 844], [768, 1024], [1024, 900], [1440, 1000]]) {
    for (const lang of Object.keys(labels)) {
      const { context, page } = await setup({ width, height, lang })
      await page.goto(base + '/login', { waitUntil: 'networkidle' })
      await page.locator('.login-panel').waitFor()
      await page.evaluate(() => document.fonts.ready)
      assert.equal(await page.locator('#login-title').innerText(), labels[lang][0])
      assert.equal(await page.title(), `${labels[lang][0]} | Glocalizer`)
      assert.equal(await page.locator('#login-password').getAttribute('autocomplete'), 'current-password')
      await page.locator('#login-password').fill('Retained password')
      await page.getByRole('button', { name: labels[lang][2], exact: true }).click()
      assert.equal(await page.locator('#login-password').getAttribute('type'), 'text')
      assert.equal(await page.locator('#login-password').inputValue(), 'Retained password')
      await page.getByRole('button', { name: labels[lang][3], exact: true }).click()
      layouts.push({ width, lang, mode: 'login', ...await geometry(page, `login ${width} ${lang}`) })
      if (lang === 'ko') await page.screenshot({ path: `${output}/login-${width}.png`, fullPage: true })
      await page.locator('.login-mode button').nth(1).click()
      await page.locator('#login-name').waitFor()
      assert.equal(await page.locator('#login-title').innerText(), labels[lang][1])
      assert.equal(await page.locator('#login-password').getAttribute('autocomplete'), 'new-password')
      assert.equal(await page.locator('#login-password').getAttribute('minlength'), '8')
      assert.equal(await page.locator('#login-password').getAttribute('type'), 'password')
      layouts.push({ width, lang, mode: 'signup', ...await geometry(page, `signup ${width} ${lang}`) })
      if (lang === 'ko' && [390, 1440].includes(width)) await page.screenshot({ path: `${output}/signup-${width}.png`, fullPage: true })
      await page.locator('.login-switch button').click()
      await page.locator('#login-name').waitFor({ state: 'detached' })
      assert.equal(await page.locator('.login-mode button[aria-pressed="true"]').innerText(), labels[lang][0])
      await context.close()
    }
    console.log(`PASS: login/signup layout and labels at ${width}px in four languages`)
  }

  // Common laptop/phone heights must fit the complete login, including legal links.
  // Resize the same page so this also covers responsive changes after initial load.
  for (const lang of Object.keys(labels)) {
    const { context, page } = await setup({ width: 1366, height: 768, lang })
    await page.goto(base + '/login')
    await page.locator('.login-panel').waitFor()
    await page.evaluate(() => document.fonts.ready)
    for (const [width, height] of [[1366, 768], [1280, 720], [1440, 800], [375, 812], [390, 844]]) {
      await page.setViewportSize({ width, height })
      const sizes = await geometry(page, `viewport fit ${width}x${height} ${lang}`)
      const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight)
      const links = await page.locator('.login-links').boundingBox()
      const header = await page.locator('header').boundingBox()
      assert.ok(pageHeight <= height + 1, `${width}x${height} ${lang}: unnecessary vertical scroll`)
      assert.ok(sizes.card.y >= header.height, `${width}x${height} ${lang}: card hidden behind header`)
      assert.ok(links.y + links.height <= height, `${width}x${height} ${lang}: legal links below viewport`)
      viewportFits.push({ width, height, lang, pageHeight })
      if (lang === 'ko' && width >= 1280) await page.screenshot({ path: `${output}/login-${width}-${height}.png`, fullPage: true })
    }
    await context.close()
  }
  console.log(`PASS: complete login fits ${viewportFits.length} laptop/phone viewport and locale combinations without vertical scroll`)

  // Keyboard-only login, loading/disabled states, reduced motion and original next URL.
  {
    const { context, page, state } = await setup({ reducedMotion: 'reduce' })
    await page.goto(fixtureBase + '/login?next=%2Freview%3Ffrom%3Dlogin%23workspace')
    await page.locator('.login-panel').waitFor()
    await page.locator('.login-mode button').first().focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    assert.equal(await page.locator('#login-email').evaluate(node => node === document.activeElement), true)
    await page.keyboard.type(user.email)
    await page.keyboard.press('Tab')
    await page.keyboard.type('original-password')
    const outline = await page.locator('#login-password').evaluate(node => ({ style: getComputedStyle(node).outlineStyle, width: getComputedStyle(node).outlineWidth }))
    assert.notEqual(outline.style, 'none')
    assert.ok(parseFloat(outline.width) >= 2)
    await page.keyboard.press('Tab')
    await page.keyboard.press('Space')
    assert.equal(await page.locator('#login-password').getAttribute('type'), 'text')
    await page.keyboard.press('Tab')
    const release = hold(state)
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.querySelector('.login-submit')?.getAttribute('aria-busy') === 'true')
    assert.equal(await page.locator('.login-panel button').evaluateAll(nodes => nodes.every(node => node.disabled)), true)
    assert.equal(await page.locator('.login-submit svg').evaluate(node => getComputedStyle(node).animationName), 'none')
    release()
    await page.waitForURL(url => url.pathname === '/review' && url.search === '?from=login' && url.hash === '#workspace')
    assert.deepEqual(state.requests[0], { path: '/auth/login', body: { email: user.email, password: 'original-password' } })
    assert.equal(await page.evaluate(() => localStorage.getItem('glocalizer:authToken')), 'login-fixture-token')
    checks.push('keyboard login, pending controls, reduced motion, original return URL')
    await context.close()
  }

  // Native validation, server error association, switching clears errors, signup payload.
  {
    const { context, page, state } = await setup()
    await page.goto(fixtureBase + '/login?next=%2Farchive')
    await page.locator('#login-email').fill('invalid')
    await page.locator('#login-password').fill('original-password')
    await page.locator('.login-submit').click()
    assert.equal(state.requests.length, 0)
    assert.equal(await page.locator('#login-email').evaluate(node => node.validity.typeMismatch), true)
    await page.locator('#login-email').fill(user.email)
    state.failure = { status: 401, message: '이메일 또는 비밀번호를 확인해 주세요.' }
    await page.locator('.login-submit').click()
    await page.getByRole('alert').filter({ hasText: state.failure.message }).waitFor()
    assert.equal(await page.locator('#login-password').getAttribute('aria-describedby'), 'login-error')
    assert.equal(await page.locator('.login-submit').isEnabled(), true)
    await page.screenshot({ path: `${output}/login-error-mobile.png`, fullPage: true })
    await page.locator('.login-mode button').nth(1).click()
    await page.locator('#login-name').waitFor()
    assert.equal(await page.locator('#login-error').count(), 0)
    await page.locator('#login-name').fill('  Creator  ')
    await page.locator('#login-password').fill('short')
    await page.locator('.login-submit').click()
    assert.equal(state.requests.length, 1)
    assert.equal(await page.locator('#login-password').evaluate(node => node.validity.tooShort), true)
    state.failure = null
    await page.locator('#login-password').fill('signup-password')
    // 약관·개인정보처리방침 동의 없이는 이메일 가입도, 가입 탭의 소셜 버튼도 진행되지 않는다.
    assert.deepEqual(await page.locator('.login-consent a').evaluateAll(links => links.map(link => [link.getAttribute('href'), link.getAttribute('target')])), [['/terms', '_blank'], ['/privacy', '_blank']])
    assert.equal(await page.locator('#login-consent').isChecked(), false)
    await page.locator('.login-submit').click()
    assert.equal(state.requests.length, 1)
    assert.equal(await page.locator('#login-consent').evaluate(node => node.validity.valueMissing), true)
    await page.locator('.login-provider').first().click()
    await page.getByRole('alert').filter({ hasText: /동의/ }).waitFor()
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'login-consent')
    assert.equal(state.requests.length, 1)
    await page.locator('#login-consent').check()
    assert.equal(await page.locator('#login-error').count(), 0)
    await page.locator('.login-submit').click()
    await page.waitForURL('**/archive')
    assert.deepEqual(state.requests[1], { path: '/auth/signup', body: { email: user.email, password: 'signup-password', name: 'Creator' } })
    checks.push('native validation, visible linked server errors, signup consent gate (email and social), name trimming and original API payload')
    await context.close()
  }

  // Existing GIS -> Supabase ID-token exchange -> backend -> safe return route.
  {
    const { context, page, state } = await setup({ googleDelay: 600 })
    await page.goto(fixtureBase + '/login?next=%2Fgenerate%3Fnew%3D1')
    const google = page.locator('.login-provider').first()
    await google.waitFor()
    await page.waitForFunction(() => document.querySelector('.login-provider')?.getAttribute('aria-busy') === 'true')
    await page.waitForFunction(() => !document.querySelector('.login-provider')?.disabled)
    const release = hold(state)
    await google.click()
    await page.waitForFunction(() => document.querySelector('.login-provider')?.getAttribute('aria-busy') === 'true')
    assert.equal(await page.locator('.login-submit').isDisabled(), true)
    release()
    await page.waitForURL('**/generate?new=1')
    assert.equal(state.exchanges[0].provider, 'google')
    assert.equal(state.exchanges[0].id_token, 'fixture-google-id-token')
    assert.ok(state.exchanges[0].nonce)
    assert.deepEqual(state.requests[0], { path: '/auth/google', body: { accessToken: jwt } })
    checks.push('Google preparation, GIS nonce, Supabase exchange and backend callback with fixtures')
    await context.close()
  }

  // Naver authorization parameters, return storage, valid and invalid CSRF state.
  for (const valid of [true, false]) {
    const { context, page, state } = await setup()
    await page.goto(fixtureBase + '/login?next=%2Fgenerate%3Fnew%3D1')
    await page.locator('.login-provider--naver').click()
    await page.waitForURL(url => url.hostname === 'nid.naver.com')
    const url = new URL(page.url())
    assert.equal(url.searchParams.get('client_id'), 'login-fixture-naver')
    assert.equal(url.searchParams.get('redirect_uri'), fixtureBase + '/auth/naver/callback')
    const oauthState = url.searchParams.get('state')
    assert.ok(oauthState)
    await page.goto(fixtureBase + `/auth/naver/callback?code=fixture-code&state=${valid ? oauthState : 'invalid-state'}`)
    if (valid) {
      await page.waitForURL('**/generate?new=1')
      assert.deepEqual(state.requests[0], { path: '/auth/naver/callback', body: { code: 'fixture-code', state: oauthState } })
    } else {
      await page.getByRole('button', { name: '로그인 화면으로 돌아가기', exact: true }).waitFor()
      assert.equal(state.requests.length, 0)
    }
    checks.push(`Naver authorization, return and ${valid ? 'valid' : 'rejected'} state with fixtures`)
    await context.close()
  }

  for (const me of [200, 401, 503]) {
    const { context, page, state } = await setup({ signedIn: true, me })
    await page.goto(fixtureBase + '/login?next=%2Farchive')
    if (me === 200) await page.waitForURL('**/archive')
    if (me === 401) {
      await page.locator('#login-email').waitFor()
      assert.equal(await page.evaluate(() => localStorage.getItem('glocalizer:authToken')), null)
    }
    if (me === 503) {
      await page.getByRole('alert').waitFor()
      assert.equal(await page.evaluate(() => localStorage.getItem('glocalizer:authToken')), 'login-fixture-token')
      state.me = 200
      await page.getByRole('button', { name: '다시 시도', exact: true }).click()
      await page.waitForURL('**/archive')
    }
    checks.push(`existing session ${me} behavior`)
    await context.close()
  }

  {
    const { context, page } = await setup()
    await page.goto(fixtureBase + '/login?next=https%3A%2F%2Fevil.example')
    await page.locator('#login-email').fill(user.email)
    await page.locator('#login-password').fill('original-password')
    await page.locator('.login-submit').click()
    await page.waitForURL('**/dashboard')
    checks.push('external return URL rejected')
    await context.close()
  }

  // Small viewports still let both modes grow and scroll past a virtual keyboard.
  {
    const { context, page } = await setup({ height: 420 })
    await page.goto(base + '/login')
    for (const mode of ['login', 'signup']) {
      if (mode === 'signup') await page.locator('.login-mode button').nth(1).click()
      await page.locator('#login-password').focus()
      await page.locator('#login-password').scrollIntoViewIfNeeded()
      const password = await page.locator('#login-password').boundingBox()
      assert.ok(password.y >= 112 && password.y + password.height <= 420)
      await page.locator('.login-provider--naver').scrollIntoViewIfNeeded()
      const provider = await page.locator('.login-provider--naver').boundingBox()
      assert.ok(provider.y >= 112 && provider.y + provider.height <= 420)
      await page.locator('.login-links a').last().scrollIntoViewIfNeeded()
      const link = await page.locator('.login-links a').last().boundingBox()
      assert.ok(link.y >= 112 && link.y + link.height <= 420)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    }
    checks.push('small visual viewport: login/signup fields, social buttons and legal links remain scrollable')
    await context.close()
  }

  assert.deepEqual(errors, [])
  await writeFile(`${output}/checks.json`, JSON.stringify({ layouts, viewportFits, checks, errors, oauth: 'mocked provider and API responses; no real accounts' }, null, 2))
  console.log(`PASS: ${layouts.length} layout/locale/mode cases, ${viewportFits.length} viewport fits; keyboard, validation, loading/error states, email/signup, Google/Naver fixtures, session recovery, return routes and mobile scrolling; no runtime errors.`)
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
