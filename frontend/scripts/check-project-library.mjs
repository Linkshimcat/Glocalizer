import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

// Stateful local API fixtures exercise the real React pages, with no paid jobs or live accounts.
const base = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5173'
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined })
const errors = []
const user = { id: 'library-user', email: 'library@example.test', name: 'Creator', signupMethod: 'email', hasPassword: true }
const date = day => `2026-10-${String(day).padStart(2, '0')}T09:00:00Z`
const cloud = (id, name, status, resultReady, day) => ({ id, name, status, resultReady, imageCount: 8, targetLanguages: ['en'], createdAt: date(day), updatedAt: date(day), thumbnailUrl: null })
const generation = (id, name, images, day, status = 'active') => ({ id, name, prompt: 'a blue cat with greetings', confirmed: true, status, created_at: date(day), images, plan: [], referenceUrl: null })
const image = (id, slot, status) => ({ id, slot, status, caption: '', url: null, prompt: '', error: null })
async function setup({ width = 1440, lang = 'ko', signedIn = true } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 } })
  const state = {
    cloud: [cloud('shared', 'Alpha', 'completed', false, 3), cloud('running', 'Beta', 'processing', false, 8), cloud('failed', 'Broken', 'failed', false, 2), cloud('archive', 'Published', 'completed', true, 1)],
    generation: [generation('shared', 'Cat', [image('old', 0, 'failed'), image('new', 0, 'completed')], 5), generation('gen-fail', 'Dog', [image('ok', 0, 'completed'), image('fail', 0, 'failed')], 4), generation('gen-done', 'Done', Array.from({ length: 24 }, (_, slot) => image(`done${slot}`, slot, 'completed')), 6, 'completed')],
    cloudStatus: 200, generationStatus: 200, mutationStatus: 204, authStatus: 503, mutations: [], reads: 0, deepRequests: 0, deepDelay: 0,
  }
  await context.addInitScript(({ lang, user, signedIn }) => {
    localStorage.setItem('glocalizer:siteLang', lang)
    if (signedIn) { localStorage.setItem('glocalizer:authToken', 'fixture-token'); localStorage.setItem('glocalizer:authUser', JSON.stringify(user)) }
  }, { lang, user, signedIn })
  await context.route('https://**/*', route => route.abort())
  await context.route('**/api/v1/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname.replace('/api/v1', ''), method = request.method()
    const reply = (data, status = 200, headers) => route.fulfill({ status, json: data, headers })
    if (method === 'OPTIONS') return reply({})
    if (path === '/auth/me') return reply({ user })
    if (path === '/auth/login') return reply({ error: { message: 'Server unavailable', code: 'SERVICE_UNAVAILABLE' } }, state.authStatus)
    if (path === '/projects' || path === '/generation/projects') {
      state.reads++
      const isCloud = path === '/projects', status = isCloud ? state.cloudStatus : state.generationStatus
      return reply(status === 200 ? { projects: isCloud ? state.cloud : state.generation } : { error: { message: 'Unavailable', code: 'SERVER_FAILURE' } }, status)
    }
    if ((method === 'PATCH' || method === 'DELETE') && /\/projects\/[^/]+$/.test(path)) {
      state.mutations.push({ method, path, body: request.postDataJSON() })
      if (state.mutationStatus !== 204) return reply({ error: { message: 'Mutation unavailable' } }, state.mutationStatus)
      const list = path.startsWith('/generation') ? 'generation' : 'cloud', id = path.split('/').at(-1)
      if (method === 'DELETE') state[list] = state[list].filter(item => item.id !== id)
      else state[list].find(item => item.id === id).name = request.postDataJSON().name || 'Untitled'
      return route.fulfill({ status: 204 })
    }
    if (path === '/review/deep-feedback') { state.deepRequests++; await new Promise(resolve => setTimeout(resolve, state.deepDelay)); return reply({ readinessScore: 70, summary: 'Review fixture summary', strengths: ['Consistent character'], priorityFixes: [{ title: 'Caption', reason: 'Small text', action: 'Enlarge the caption' }], imageFeedback: [], localizationFeedback: [], disclaimer: 'Reference only' }) }
    if (path === '/generation/config') return reply({ enabled: true })
    if (path.endsWith('/workspace')) return reply({ projectId: path.split('/')[2], projectToken: 'account', resultReady: false, selectedClientIds: [], files: [], results: { assets: [], targetLanguages: [] }, status: { status: 'created', assets: [], projectId: path.split('/')[2] } })
    return reply({})
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  return { context, page, state }
}
async function until(page, predicate, label) {
  for (let i = 0; i < 100; i++) { if (await predicate()) return; await page.waitForTimeout(50) }
  assert.fail(label)
}
const keys = page => page.locator('[data-project-key]').evaluateAll(nodes => nodes.map(node => node.dataset.projectKey))
const waitCount = (page, count) => until(page, async () => (await keys(page)).length === count && await page.locator('.project-library-skeleton').count() === 0, `Expected ${count} loaded cards`)
await mkdir('/tmp/glocalizer-project-library', { recursive: true })
try {
  for (const width of [320, 390, 768, 1440]) {
    for (const lang of ['ko', 'en', 'ja', 'zh']) {
      const { page, context } = await setup({ width, lang })
      await page.goto(base + '/dashboard')
      await waitCount(page, 5)
      assert.deepEqual(await keys(page), ['localization:running', 'generation:shared', 'generation:gen-fail', 'localization:shared', 'localization:failed'])
      assert.equal(await page.locator('main#main-content').count(), 1)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${lang} ${width}`)
      if (lang !== 'ko') assert.equal(await page.locator('.project-library').evaluate(node => /[가-힣]/.test(node.innerText)), false)
      if (lang === 'ko') await page.screenshot({ path: `/tmp/glocalizer-project-library/dashboard-${width}.png`, fullPage: true })
      await context.close()
    }
  }
  {
    const { page, context, state } = await setup()
    await page.goto(base + '/dashboard?keep=1')
    await waitCount(page, 5)
    await page.getByLabel('프로젝트 검색', { exact: true }).fill(' BLUE CAT ')
    await waitCount(page, 2)
    await page.getByLabel('작업 상태', { exact: true }).selectOption('attention')
    await waitCount(page, 1)
    assert.deepEqual(await keys(page), ['generation:gen-fail'], 'Latest failed retry remains visible while obsolete failure is ignored')
    await page.reload(); await waitCount(page, 1)
    assert.equal(await page.getByLabel('프로젝트 검색', { exact: true }).inputValue(), ' BLUE CAT ')
    await page.getByRole('button', { name: '조건 초기화', exact: true }).click(); await waitCount(page, 5)
    assert.equal(new URL(page.url()).searchParams.get('keep'), '1')
    await page.getByLabel('정렬', { exact: true }).selectOption('oldest')
    await until(page, async () => (await keys(page))[0] === 'localization:failed', 'Sort oldest')
    await page.getByLabel('정렬', { exact: true }).selectOption('name')
    await until(page, async () => (await keys(page))[0] === 'localization:shared', 'Sort name')
    await page.getByLabel('작업 종류', { exact: true }).selectOption('localization'); await waitCount(page, 3)
    await page.getByLabel('프로젝트 검색', { exact: true }).fill('missing'); await waitCount(page, 0)
    await page.getByText('조건에 맞는 프로젝트가 없어요.', { exact: true }).waitFor()
    await page.getByRole('button', { name: '조건 초기화', exact: true }).first().click(); await waitCount(page, 5)
    const card = page.locator('[data-project-key="generation:shared"]')
    if (!await card.locator('details').evaluate(node => node.open)) await card.locator('summary').click();
    await card.getByRole('button', { name: '이름 변경', exact: true }).click()
    await page.getByRole('dialog').waitFor()
    await page.locator('#library-name').fill('Renamed')
    await page.keyboard.press('Tab')
    assert.equal(await page.getByRole('dialog').evaluate(node => node.contains(document.activeElement)), true)
    await page.locator('#library-name').press('Enter'); await page.getByRole('dialog').waitFor({ state: 'detached' })
    await until(page, async () => await card.locator('h3').innerText() === 'Renamed', 'Rename reflected')
    assert.equal(state.mutations.length, 1)
    assert.equal(state.mutations[0].path, '/generation/projects/shared', 'Same identifiers are separated by project type')
    await waitCount(page, 5)
    if (!await card.locator('details').evaluate(node => node.open)) await card.locator('summary').click()
    await card.getByRole('button', { name: '이름 변경', exact: true }).click(); await page.locator('#library-name').fill('Keep this draft')
    state.mutationStatus = 503
    await page.locator('#library-name').press('Enter')
    await page.getByRole('alert').filter({ hasText: '서버 응답' }).waitFor()
    assert.equal(await page.locator('#library-name').inputValue(), 'Keep this draft')
    state.mutationStatus = 204
    await page.locator('#library-name').press('Enter'); await page.getByRole('dialog').waitFor({ state: 'detached' })
    await waitCount(page, 5)
    const remove = page.locator('[data-project-key="localization:shared"]')
    await remove.locator('summary').click(); await remove.getByRole('button', { name: '삭제', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: '영구 삭제', exact: true }).click(); await waitCount(page, 4)
    assert.equal(state.mutations.at(-1).path, '/projects/shared')
    assert.equal(await page.locator('[data-project-key="generation:shared"]').count(), 1)
    const reads = state.reads
    state.cloud.push(cloud('returned', 'Another device', 'completed', false, 9))
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await waitCount(page, 5)
    assert.ok(state.reads > reads)
    state.cloud.find(project => project.id === 'running').status = 'completed'
    await page.waitForFunction(() => document.querySelector('[data-project-key="localization:running"] [data-state="editing"]'), null, { timeout: 15000 })
    assert.equal(await page.locator('[data-project-key="localization:running"]').count(), 1, 'Background polling preserves the visible library')
    await page.goto(base + '/archive'); await waitCount(page, 2)
    assert.deepEqual(await keys(page), ['generation:gen-done', 'localization:archive'])
    await page.screenshot({ path: '/tmp/glocalizer-project-library/archive.png', fullPage: true })
    await page.locator('[data-project-key="generation:gen-done"]').getByRole('button', { name: '작업 열기', exact: true }).last().click()
    await page.waitForURL('**/generate?project=gen-done')
    await context.close()
  }
  for (const failedSource of ['cloudStatus', 'generationStatus']) {
    const { page, context, state } = await setup({ width: 390 })
    state[failedSource] = 503
    await page.goto(base + '/dashboard'); await waitCount(page, failedSource === 'cloudStatus' ? 2 : 3)
    await page.getByRole('alert').filter({ hasText: '일부 프로젝트' }).waitFor()
    await page.screenshot({ path: `/tmp/glocalizer-project-library/partial-${failedSource}.png`, fullPage: true })
    state[failedSource] = 200
    await page.getByRole('button', { name: '다시 시도', exact: true }).click(); await waitCount(page, 5)
    assert.equal(await page.getByRole('alert').count(), 0)
    state.cloudStatus = state.generationStatus = 503
    await page.getByRole('button', { name: '새로고침', exact: true }).click(); await waitCount(page, 0)
    await page.getByRole('alert').waitFor()
    assert.equal(await page.locator('.project-library-empty').count(), 0, 'Total failure is not an empty library')
    await context.close()
  }
  {
    const { page, context, state } = await setup({ lang: 'en', signedIn: false })
    await page.goto(base + '/login')
    await page.locator('input[type="email"]').fill('creator@example.test')
    await page.locator('input[type="password"]').fill('preserved-password')
    await page.locator('button[type="submit"]').click()
    await page.getByRole('alert').filter({ hasText: 'The server is taking longer' }).waitFor()
    assert.equal(await page.locator('input[type="email"]').inputValue(), 'creator@example.test')
    assert.equal(await page.locator('input[type="password"]').inputValue(), 'preserved-password')
    state.authStatus = 429
    await page.locator('button[type="submit"]').click()
    await page.getByRole('alert').filter({ hasText: 'Too many requests' }).waitFor()
    const metadata = await page.evaluate(async () => {
      const { responseFailure, RequestError, requestErrorMessage } = await import('/src/lib/requestError.ts')
      const { AuthApiError } = await import('/src/lib/authApi.ts')
      const details = await responseFailure(new Response(JSON.stringify({ error: { code: 'LIMIT', message: 'Limited' } }), { status: 429, headers: { 'Retry-After': '12' } }), 'fallback')
      const auth = new AuthApiError(details.message, details.status, details.code, details.retryAfterSeconds)
      return { details, isAuth: auth instanceof AuthApiError, isRequest: auth instanceof RequestError, localized: requestErrorMessage(auth, 'en', 'fallback') }
    })
    assert.deepEqual(metadata.details, { message: 'Limited', status: 429, code: 'LIMIT', retryAfterSeconds: 12 })
    assert.equal(metadata.isAuth && metadata.isRequest, true)
    assert.match(metadata.localized, /Too many requests/)
    await context.close()
  }
  {
    const { page, context, state } = await setup()
    await page.goto(base + '/review')
    const published = page.locator('main button[aria-pressed]').filter({ hasText: 'Published' })
    await published.click()
    await page.locator('#review-ai').waitFor()
    assert.equal(await page.locator('a[href="#review-specs"]').count(), 1)
    await page.getByRole('button', { name: '심층 피드백 받기', exact: true }).click()
    await page.getByText('Review fixture summary', { exact: true }).waitFor()
    await page.evaluate(() => scrollTo(0, 0))
    await page.screenshot({ path: '/tmp/glocalizer-project-library/review-feedback.png', fullPage: true })
    state.deepDelay = 300
    await page.getByRole('button', { name: '심층 피드백 받기', exact: true }).click()
    await until(page, () => state.deepRequests === 2, 'Deep request started')
    await published.click()
    await page.waitForTimeout(500)
    assert.equal(await page.getByText('Review fixture summary', { exact: true }).count(), 0, 'Feedback from a previous selection is discarded')
    const goodPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jCTkAAAAASUVORK5CYII=', 'base64')
    await page.locator('#review-specs input[type="file"]').setInputFiles([{ name: 'good.png', mimeType: 'image/png', buffer: goodPng }, { name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('invalid image') }])
    await page.locator('#review-specs').getByRole('alert').waitFor()
    await page.locator('#review-specs').getByText('good.png', { exact: true }).waitFor()
    await context.close()
  }
  {
    const { page, context } = await setup({ lang: 'en', signedIn: false })
    await page.goto(base + '/login')
    await page.locator('input[type="email"]').waitFor()
    await page.evaluate(async () => {
      const { default: { createElement } } = await import('/node_modules/.vite/deps/react.js')
      const { default: { createRoot } } = await import('/node_modules/.vite/deps/react-dom_client.js')
      const { MemoryRouter } = await import('/node_modules/.vite/deps/react-router-dom.js')
      const { SiteLangProvider } = await import('/src/i18n/LanguageContext.tsx')
      const { AppErrorBoundary } = await import('/src/components/AppErrorBoundary.tsx')
      const target = document.createElement('div'); target.id = 'boundary-fixture'; document.body.append(target)
      function Broken() { throw new Error('Expected fixture failure') }
      createRoot(target).render(createElement(MemoryRouter, null, createElement(SiteLangProvider, null, createElement(AppErrorBoundary, null, createElement(Broken)))))
    })
    await page.locator('#boundary-fixture').getByRole('heading', { name: 'This page could not be loaded', exact: true }).waitFor()
    assert.match(await page.locator('#boundary-fixture').innerText(), /Unsaved changes/)
    await context.close()
  }
  assert.deepEqual(errors, [])
  console.log('PASS: 16 locale/viewport library cases; query persistence, filters, status history, sort, rename/delete, input preservation, focus refresh and polling, archive/open, independent source recovery, 429/503 metadata, review selection, corrupt images and localized error boundary.')
} finally { await browser.close() }
