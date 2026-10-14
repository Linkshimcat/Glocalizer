import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createRequire } from 'node:module'
const sharp = createRequire(new URL('../../backend/package.json', import.meta.url))('sharp')
const imageUrl = `data:image/png;base64,${(await sharp({ create: { width: 320, height: 240, channels: 4, background: '#88bbee' } }).png().toBuffer()).toString('base64')}`
const base = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5173'
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined })
const errors = []
const user = { id: 'security-user', email: 'private@example.test', name: 'Security', avatarUrl: null }
function workspace(count) {
  const assets = Array.from({ length: count }, (_, i) => ({
    id: `asset-${i}`, name: `frame-${i}.png`, status: 'completed', width: 320, height: 240, originalUrl: imageUrl, cleanedUrl: imageUrl,
    ocr: { fullText: '', primaryRegionId: null, regions: [], fontStyle: null }, localizations: {}, cleanup: { method: null, quality: null, needsManualCleanup: false, textColor: null },
    needsManualOcrReview: false, editorStates: {}, regionEditorStates: {},
  }))
  return { projectId: 'security-project', projectToken: 'account', resultReady: true, selectedClientIds: assets.map((_, i) => `file-${i}`), files: assets.map((asset, i) => ({ id: `file-${i}`, assetId: asset.id, name: asset.name, type: 'image/png', size: 100 })),
    results: { projectId: 'security-project', status: 'completed', targetLanguages: ['en'], assets }, status: { projectId: 'security-project', status: 'completed', stage: null, progress: 100, message: '', assets: [] } }
}
async function setup(mode, count = 1) {
  const context = await browser.newContext()
  const state = { workspace: workspace(count), posts: 0, done: false, bodies: [] }
  await context.addInitScript(({ user }) => {
    localStorage.setItem('glocalizer:siteLang', 'ko')
    localStorage.setItem('glocalizer:authToken', 'test-token')
    localStorage.setItem('glocalizer:authUser', JSON.stringify(user))
    sessionStorage.setItem('glocalizer:cloudOwnerId', JSON.stringify(user.id))
    sessionStorage.setItem('glocalizer:cloudProjectId', JSON.stringify('security-project'))
  }, { user })
  await context.route('https://**/*', route => route.abort())
  await context.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '')
    const reply = data => route.fulfill({ json: data })
    if (route.request().method() === 'OPTIONS') return reply({})
    if (path === '/auth/me') return reply({ user })
    if (path.endsWith('/workspace')) return reply(state.workspace)
    if (path.endsWith('/status')) {
      if (mode === 'timeout' && state.posts && !state.done) return reply({ ...state.workspace.status, status: 'processing' })
      return reply(state.workspace.status)
    }
    if (path.endsWith('/results')) return reply(state.workspace.results)
    if (path.endsWith('/caption-suggestion')) return reply({ emotion: '기쁨', emotionConfidence: .9, action: '인사', situations: ['인사'], candidates: [{ text: '안녕!', tone: '반가운', best: true }, { text: '반가워', tone: '친근한', best: false }, { text: '하이', tone: '경쾌한', best: false }] })
    if (path.endsWith('/ocr/regions')) {
      state.posts++
      const body = route.request().postDataJSON(); state.bodies.push(body)
      const asset = state.workspace.results.assets.find(asset => asset.id === path.split('/')[4])
      if (mode === 'partial' && asset.id === 'asset-1') {
        state.workspace.status.status = 'failed'; asset.status = 'failed'
      } else {
        asset.ocr.regions.push({ id: `r-${asset.id}`, text: body.text, confidence: 1, normalizedBox: body.normalizedBox, localizations: {} })
        asset.ocr.fullText = body.text; asset.ocr.primaryRegionId = `r-${asset.id}`
      }
      if (mode === 'lost') return route.abort('connectionreset')
      return route.fulfill({ status: 202, json: { status: 'reprocessing', jobId: `job-${state.posts}` } })
    }
    if (path.endsWith('/editor-state')) return route.fulfill({ status: 204 })
    if (path === '/generation/config') return reply({ enabled: false })
    if (path === '/generation/projects' || path === '/projects') return reply({ projects: [] })
    if (path === '/landing/showcases') return reply({ showcases: [] })
    return reply({})
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(base + '/editor')
  await page.locator('img[src^="data:image/png"]').first().waitFor()
  await page.evaluate(() => { history.pushState({}, '', '/caption-suggest'); dispatchEvent(new PopStateEvent('popstate')) })
  await page.getByRole('button', { name: 'AI 문구 추천받기' }).click()
  await page.getByRole('button', { name: '한 번에 검토하기' }).waitFor()
  const review = page.getByRole('button', { name: '한 번에 검토하기' })
  await review.waitFor(); await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === '한 번에 검토하기' && !button.disabled))
  await review.click()
  return { context, page, state }
}
try {
  {
    const { context, page, state } = await setup('success', 2)
    await page.getByRole('button', { name: '2개 적용하고 계속' }).click()
    await page.waitForFunction(() => location.pathname === '/editor')
    assert.equal(state.posts, 2); assert.equal(state.workspace.results.assets.every(asset => asset.ocr.regions.length === 1), true)
    await context.close()
  }
  {
    const { context, page, state } = await setup('partial', 2)
    await page.getByRole('button', { name: '2개 적용하고 계속' }).click()
    await page.getByText('적용 실패. 편집기에서 확인해주세요.').waitFor()
    assert.match(page.url(), /caption-suggest$/)
    await page.getByText('적용 완료', { exact: true }).waitFor()
    await page.getByRole('button', { name: '상태 확인하고 계속' }).click()
    await page.getByRole('button', { name: '편집기에서 확인', exact: true }).waitFor()
    assert.equal(state.posts, 2)
    await context.close()
  }
  for (const mode of ['lost', 'timeout']) {
    const { context, page, state } = await setup(mode)
    if (mode === 'timeout') await page.clock.install()
    await page.getByRole('button', { name: '1개 적용하고 계속' }).click()
    if (mode === 'timeout') {
      await page.getByRole('button', { name: '0/1 적용 중…' }).waitFor()
      await page.clock.setSystemTime(new Date(Date.now() + 360_100))
      await page.clock.runFor(1600)
    }
    await page.getByText('완료를 확인하지 못했어요. 상태를 확인하면 문구를 중복 추가하지 않아요.').waitFor()
    assert.match(page.url(), /caption-suggest$/)
    state.done = true
    await page.getByRole('button', { name: '상태 확인하고 계속' }).click()
    await page.waitForFunction(() => location.pathname === '/editor')
    assert.equal(state.posts, 1)
    assert.equal(state.workspace.results.assets[0].ocr.regions.length, 1)
    await context.close()
  }
  assert.deepEqual(errors, [])
  console.log('PASS: caption success, partial failure, timeout, lost response reconciliation and duplicate prevention; no real API writes.')
} finally { await browser.close() }
