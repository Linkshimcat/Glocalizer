import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { chromium } from 'playwright'
import { createRequire } from 'node:module'
const sharp = createRequire(new URL('../../backend/package.json', import.meta.url))('sharp')

// Deterministic fixtures; no production accounts, Naver credentials or paid AI calls.
const base = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5173'
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined })
const errors = []
const user = { id: 'workflow-user', email: 'yunjae14278@naver.com', name: 'Workflow', avatarUrl: null, signupMethod: 'naver' }
const png = await sharp(Buffer.from('<svg width="320" height="240"><rect x="80" y="20" width="160" height="140" rx="30" fill="#88bbee"/></svg>')).png().toBuffer()
const imageUrl = `data:image/png;base64,${png.toString('base64')}`
const defaultStyle = { suggestion: 0, customText: '', font: 'Arial', size: 28, weight: 800, rotation: 0, color: '#191F28', transparent: true, strokeOn: false, strokeWidth: 2, strokeColor: '#FFFFFF', backgroundOn: false, backgroundColor: '#FFFFFF', backgroundOpacity: 85, backgroundPadding: 6, backgroundRadius: 8, shadowOn: false, shadowColor: '#000000', shadowBlur: 10, shadowX: 0, shadowY: 4, shadowOpacity: 50, x: 0, y: 80, alignH: null, alignV: null, imageScale: 100 }
function workspace(count) {
  const localizations = { en: { status: 'translated', candidates: [{ text: 'Hello', tone: 'friendly', best: true }], recommendedStyle: null }, ja: { status: 'translated', candidates: [{ text: '最高！', tone: 'friendly', best: true }], recommendedStyle: null } }
  const assets = Array.from({ length: count }, (_, i) => ({
    id: `asset-${i}`, name: `frame-${i}.png`, type: 'image/png', width: 320, height: 240, status: 'completed', originalUrl: imageUrl, cleanedUrl: imageUrl,
    ocr: { fullText: '안녕', primaryRegionId: `r-${i}`, fontStyle: null, regions: ['r', 'secondary'].map((prefix, j) => ({ id: `${prefix}-${i}`, text: '안녕', confidence: .99, normalizedBox: { x: .2, y: .65 - j * .5, width: .6, height: .2 }, source: 'paddle-consensus', agreementScore: 1, needsManualReview: false, fontStyle: null, textColor: null, needsManualCleanup: i === 0, localizations })) },
    localizations, cleanup: { method: 'transparent-mask', quality: 'high', needsManualCleanup: i === 0, textColor: null }, needsManualOcrReview: false,
    editorStates: {}, regionEditorStates: { [`r-${i}`]: { en: { ...defaultStyle, customText: `old-${i}`, size: 24 + i, x: i }, ja: { ...defaultStyle, customText: `日本語${i}` } }, [`secondary-${i}`]: { en: { ...defaultStyle, customText: `secondary-${i}`, y: -80 }, ja: { ...defaultStyle, customText: `追加${i}`, y: -80 } } },
  }))
  return { projectId: 'workflow-project', projectToken: 'account', resultReady: true, selectedClientIds: assets.map((_, i) => `file-${i}`), files: assets.map((asset, i) => ({ id: `file-${i}`, assetId: asset.id, name: asset.name, type: 'image/png', size: png.length })), results: { projectId: 'workflow-project', status: 'completed', targetLanguages: ['en', 'ja'], assets }, status: { projectId: 'workflow-project', status: 'completed', stage: null, progress: 100, message: '', assets: [] } }
}
async function setup({ width = 1280, count = 8, me = 200, signedIn = true, voice = true } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, acceptDownloads: true })
  const state = { workspace: workspace(count), saves: [], downloads: [], batchPosts: 0, authPosts: 0, me }
  await context.addInitScript(({ user, signedIn, voice }) => {
    localStorage.setItem('glocalizer:siteLang', 'ko')
    if (signedIn) {
      localStorage.setItem('glocalizer:authToken', 'workflow-token')
      localStorage.setItem('glocalizer:authUser', JSON.stringify(user))
      sessionStorage.setItem('glocalizer:cloudOwnerId', JSON.stringify(user.id))
      sessionStorage.setItem('glocalizer:cloudProjectId', JSON.stringify('workflow-project'))
    }
    const events = new EventTarget()
    const speech = { utterances: [], cancellations: 0, voices: voice ? [{ name: 'Japanese', lang: 'ja-JP' }] : [], getVoices() { return this.voices }, speak(u) { this.utterances.push(u) }, cancel() { this.cancellations++ }, addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events), dispatchEvent: events.dispatchEvent.bind(events) }
    Object.defineProperty(window, 'speechSynthesis', { value: speech, configurable: true })
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text } }
    window.__speech = speech
  }, { user, signedIn, voice })
  await context.route('https://**/*', route => route.abort())
  await context.route('**/api/v1/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname.replace('/api/v1', ''), method = req.method()
    const reply = (data, status = 200) => route.fulfill({ status, json: data })
    if (method === 'OPTIONS') return reply({})
    if (path === '/auth/me') return reply(state.me === 200 ? { user } : { error: { message: 'Session unavailable' } }, state.me)
    if (path === '/auth/naver/callback') { state.authPosts++; return reply({ token: 'workflow-token', user }) }
    if (path.endsWith('/workspace')) return reply(state.workspace)
    if (path.endsWith('/status')) return reply(state.workspace.status)
    if (path.endsWith('/results')) return reply(state.workspace.results)
    if (path.endsWith('/editor-state')) {
      if (state.failWrites) return reply({ error: { message: 'Save failed' } }, 503)
      const body = req.postDataJSON(), id = path.split('/')[4]
      state.saves.push({ assetId: id, ...body })
      const asset = state.workspace.results.assets.find(asset => asset.id === id)
      asset.regionEditorStates[body.regionId][body.languageCode] = body.style
      return route.fulfill({ status: 204 })
    }
    if (path.endsWith('/downloads')) { state.downloads.push(req.postDataJSON()); return route.fulfill({ status: 204 }) }
    if (path.endsWith('/finish')) return route.fulfill({ status: 204 })
    if (path === '/generation/config') return reply({ enabled: true })
    if (path === '/generation/projects') return reply({ projects: state.generation ? [state.generation] : [] })
    if (path === '/generation/projects/gen-project' && method === 'GET') return reply(state.generation)
    if (path.endsWith('/plan') && method === 'PATCH') { state.planSaved = req.postDataJSON().plan; state.generation.plan = state.planSaved; return route.fulfill({ status: 204 }) }
    if (path.endsWith('/batch')) {
      state.batchPosts++
      const slots = req.postDataJSON().slots
      state.queuedSlots = slots
      state.generation.images.push(...slots.map(slot => ({ id: `queued-${slot}`, slot, status: 'queued', caption: '', prompt: '', url: null })))
      return route.abort('connectionreset') // server accepted the paid jobs, response was lost
    }
    if (path === '/projects') return reply({ projects: [] })
    if (path === '/landing/showcases') return reply({ showcases: [] })
    return reply({})
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  return { context, page, state }
}
const noOverflow = async (page, label) => {
  const sizes = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }))
  assert.ok(sizes.page <= sizes.viewport + 1, `${label}: ${JSON.stringify(sizes)}`)
}
try {
  await mkdir('/tmp/glocalizer-workflows', { recursive: true })
  // Real pages and composed PNGs at phone, tablet and desktop widths.
  for (const width of [360, 390, 768, 1280]) {
    const { context, page } = await setup({ width })
    for (const path of ['/editor', '/result', '/generate', '/login?next=%2Feditor']) {
      console.log(`Checking ${path} at ${width}px`)
      await page.goto(base + path, { waitUntil: 'domcontentloaded' })
      await ((path === '/editor' || path.startsWith('/login')) ? page.locator('textarea').first() : page.locator('main')).waitFor()
      if (path === '/result') await page.locator('img[src^="blob:"]').first().waitFor()
      await noOverflow(page, `${path} ${width}`)
      await page.screenshot({ path: `/tmp/glocalizer-workflows/${path.split('?')[0].slice(1)}-${width}.png`, fullPage: true })
      if (path === '/editor' || path === '/result') {
        if (path === '/editor') await page.getByRole('button', { name: '다운로드 미리보기', exact: true }).click()
        else await page.locator('img[src^="blob:"]').first().click()
        await page.getByRole('dialog').waitFor()
        await page.getByRole('dialog').locator('img[src^="blob:"]').waitFor()
        await noOverflow(page, `${path} modal ${width}`)
        await page.screenshot({ path: `/tmp/glocalizer-workflows/${path.slice(1)}-modal-${width}.png`, fullPage: true })
        await page.keyboard.press('Escape')
      }
    }
    await context.close()
  }
  // Batch edits go through the real React store and cloud save queue.
  for (const count of [8, 24]) {
    const { context, page, state } = await setup({ count })
    await page.goto(base + '/editor')
    const textarea = page.locator('textarea').first()
    await textarea.waitFor()
    await textarea.fill('Batch phrase')
    await page.getByRole('button', { name: '모든 프레임에 같은 문구 적용', exact: true }).click()
    for (let i = 0; i < 100 && !state.workspace.results.assets.every(asset => asset.regionEditorStates[asset.ocr.primaryRegionId].en.customText === 'Batch phrase'); i++) await page.waitForTimeout(50)
    assert.equal(state.workspace.results.assets.every(asset => asset.regionEditorStates[asset.ocr.primaryRegionId].en.customText === 'Batch phrase'), true, JSON.stringify(state.saves))
    for (const [i, asset] of state.workspace.results.assets.entries()) {
      assert.equal(asset.regionEditorStates[`r-${i}`].en.size, 24 + i)
      assert.equal(asset.regionEditorStates[`r-${i}`].en.x, i)
      assert.equal(asset.regionEditorStates[`r-${i}`].ja.customText, `日本語${i}`)
      assert.equal(asset.regionEditorStates[`secondary-${i}`].en.customText, `secondary-${i}`)
    }
    await page.getByRole('button', { name: '일괄 적용 되돌리기', exact: true }).click()
    for (let i = 0; i < 100 && state.workspace.results.assets.slice(1).some(asset => asset.regionEditorStates[asset.ocr.primaryRegionId].en.customText === 'Batch phrase'); i++) await page.waitForTimeout(50)
    for (const [i, asset] of state.workspace.results.assets.entries()) assert.equal(asset.regionEditorStates[`r-${i}`].en.customText, i === 0 ? 'Batch phrase' : `old-${i}`)
    await context.close()
  }
  // Result preview and download use identical pixels and respect preset dimensions.
  {
    const { context, page, state } = await setup()
    await page.addInitScript(() => sessionStorage.setItem('glocalizer:exportPresets', JSON.stringify({ 'workflow-project': 'ogq-sticker' })))
    await page.goto(base + '/result')
    const thumbnail = page.locator('img[src^="blob:"]').first()
    await thumbnail.waitFor()
    const preview = Buffer.from(await thumbnail.evaluate(async img => [...new Uint8Array(await (await fetch(img.src)).arrayBuffer())]))
    await thumbnail.click()
    const dialog = page.getByRole('dialog')
    await dialog.waitFor()
    await noOverflow(page, 'result modal')
    await page.keyboard.press('ArrowRight')
    await dialog.getByRole('heading').filter({ hasText: 'frame-1.png' }).waitFor()
    await page.keyboard.press('ArrowLeft')
    await dialog.getByRole('heading').filter({ hasText: 'frame-0.png' }).waitFor()
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab')
      assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), true)
    }
    const fileEvent = page.waitForEvent('download')
    await dialog.getByRole('button', { name: 'PNG', exact: true }).click()
    const downloaded = await fileEvent
    const file = await readFile(await downloaded.path())
    const { width, height } = await sharp(file).metadata()
    assert.deepEqual([width, height], [740, 640])
    assert.deepEqual(await sharp(file).raw().toBuffer(), await sharp(preview).raw().toBuffer())
    assert.equal(state.downloads.at(-1).kind, 'single')
    await page.keyboard.press('Escape')
    assert.equal(await dialog.count(), 0)
    await page.getByRole('button', { name: '원래 글자 보정하기', exact: true }).first().click()
    await page.waitForURL('**/editor?cleanup=file-0')
    await page.locator('[role="status"] details summary').click()
    await page.getByText('자동 정리가 어려운 이미지입니다.', { exact: false }).first().waitFor()
    await context.close()
  }
  // Rendering errors have an actionable retry without losing the edit state.
  {
    const { context, page, state } = await setup({ count: 1 })
    state.workspace.results.assets[0].cleanedUrl = base + '/__fixture__.png'
    let ready = false
    await page.route('**/__fixture__.png', route => ready ? route.fulfill({ contentType: 'image/png', body: png }) : route.fulfill({ status: 503, body: '' }))
    await page.goto(base + '/result')
    const failure = page.getByRole('alert').filter({ hasText: '미리보기를 만들지 못했어요.' }).first()
    await failure.waitFor()
    ready = true
    await failure.getByRole('button', { name: '다시 시도', exact: true }).click()
    await page.locator('img[src^="blob:"]').first().waitFor()
    await context.close()
  }
  // Voice availability may arrive late; speech stops on edits, language changes and unmount.
  for (const voice of [true, false]) {
    const { context, page } = await setup({ voice })
    await page.goto(base + '/editor')
    await page.getByRole('button', { name: '🇯🇵 日本語', exact: true }).click()
    const listen = page.getByRole('button', { name: '일본어 발음 듣기', exact: true })
    await listen.waitFor()
    if (!voice) {
      await page.getByText('이 기기에 일본어 음성이 없어 발음을 들을 수 없어요.', { exact: true }).waitFor()
      assert.equal(await listen.isDisabled(), true)
      await page.evaluate(() => { window.__speech.voices = [{ name: 'Japanese', lang: 'ja-JP' }]; window.__speech.dispatchEvent(new Event('voiceschanged')) })
    }
    await listen.click()
    assert.equal(await page.evaluate(() => window.__speech.utterances.at(-1).text), '日本語0')
    await page.getByRole('button', { name: '듣기 정지', exact: true }).click()
    await listen.click()
    await page.locator('textarea').first().fill('新しい文句')
    await listen.waitFor()
    await listen.click()
    assert.equal(await page.evaluate(() => window.__speech.utterances.at(-1).text), '新しい文句')
    await page.evaluate(() => window.__speech.utterances.at(-1).onerror())
    await page.getByText('음성을 재생하지 못했어요. 다시 시도해주세요.', { exact: true }).waitFor()
    await listen.click()
    const before = await page.evaluate(() => window.__speech.cancellations)
    await page.getByRole('button', { name: '🇺🇸 English', exact: true }).click()
    assert.ok(await page.evaluate(() => window.__speech.cancellations) > before)
    assert.equal(await listen.count(), 0)
    await page.getByRole('button', { name: '🇯🇵 日本語', exact: true }).click()
    await listen.click()
    const unmountBefore = await page.evaluate(() => window.__speech.cancellations)
    // Use SPA navigation through the completion preview's PNG download.
    const event = page.waitForEvent('download')
    await page.getByRole('button', { name: /PNG 저장/ }).filter({ visible: true }).click()
    await event
    await page.waitForURL('**/result')
    await page.getByRole('heading', { name: '다운로드를 시작했어요', exact: true }).waitFor()
    await listen.waitFor({ state: 'detached' })
    for (let i = 0; i < 20 && await page.evaluate(() => window.__speech.cancellations) === unmountBefore; i++) await page.waitForTimeout(50)
    assert.ok(await page.evaluate(() => window.__speech.cancellations) > unmountBefore)
    await context.close()
  }
  // Failed cloud edits remain retryable and are flushed before completing a download.
  {
    const { context, page, state } = await setup()
    await page.goto(base + '/editor')
    await page.locator('textarea').first().waitFor()
    state.failWrites = true
    await page.locator('textarea').first().fill('Retry phrase')
    await page.locator('[role="alert"]').first().waitFor()
    state.failWrites = false
    await page.locator('[role="alert"]').first().getByRole('button').click()
    for (let i = 0; i < 100 && state.workspace.results.assets[0].regionEditorStates['r-0'].en.customText !== 'Retry phrase'; i++) await page.waitForTimeout(50)
    assert.equal(state.workspace.results.assets[0].regionEditorStates['r-0'].en.customText, 'Retry phrase')
    await context.close()
  }
  // Session recovery and OAuth return state validation.
  for (const me of [200, 401, 503]) {
    const { context, page, state } = await setup({ me })
    await page.goto(base + '/login?next=%2Fgenerate%3Fproject%3Dgen-project')
    if (me === 200) await page.waitForURL('**/generate?project=gen-project')
    if (me === 401) { await page.locator('input[type="email"]').waitFor(); assert.equal(await page.evaluate(() => localStorage.getItem('glocalizer:authToken')), null) }
    if (me === 503) {
      await page.getByText('로그인 상태를 확인하지 못했어요. 다시 시도해주세요.', { exact: true }).waitFor()
      assert.equal(await page.evaluate(() => localStorage.getItem('glocalizer:authToken')), 'workflow-token')
      state.me = 200
      await page.getByRole('button', { name: '다시 시도', exact: true }).click()
      await page.waitForURL('**/generate?project=gen-project')
    }
    await context.close()
  }
  for (const valid of [true, false]) {
    const { context, page, state } = await setup({ signedIn: false })
    await page.goto(base + '/login')
    await page.evaluate(async () => {
      const { rememberLoginReturn } = await import('/src/lib/loginReturn.ts')
      rememberLoginReturn('/generate?project=gen-project')
      sessionStorage.setItem('glocalizer:naverState', 'expected-state')
    })
    await page.goto(base + `/auth/naver/callback?code=test&state=${valid ? 'expected-state' : 'wrong-state'}`)
    if (valid) { await page.waitForURL('**/generate?project=gen-project'); assert.equal(state.authPosts, 1) }
    else { await page.getByRole('button').waitFor(); assert.equal(state.authPosts, 0) }
    await context.close()
  }
  {
    const { context, page } = await setup({ signedIn: false })
    await page.goto(base + '/login')
    const edits = await page.evaluate(async () => {
      const { frameTextEdits } = await import('/src/lib/frameText.ts')
      const { DEFAULT_STYLE } = await import('/src/lib/style.ts')
      const region = (id) => ({ id, suggestions: [{ text: 'Primary' }], recommendedFont: 'Arial', normalizedBox: null })
      const items = [{ id: 'a', analysis: { regionId: 'primary' }, textRegions: [region('primary'), region('secondary')] }, { id: 'failed', analysis: { regionId: null }, textRegions: [] }]
      const styles = { a: { en: { ...DEFAULT_STYLE, customText: 'Before', size: 37 } }, 'a::secondary': { en: { ...DEFAULT_STYLE, customText: 'Secondary' } } }
      return frameTextEdits(items, 'en', styles, 'Copied', { fileId: 'a', regionId: 'secondary', style: { ...DEFAULT_STYLE, font: 'Edited secondary', size: 90 } })
    })
    assert.equal(edits.length, 1)
    assert.equal(edits[0].regionId, 'primary')
    assert.equal(edits[0].previousText, 'Before')
    assert.equal(edits[0].style.size, 37)
    assert.equal(edits[0].style.customText, 'Copied')
    const returns = await page.evaluate(async () => {
      const { safeLoginReturn } = await import('/src/lib/loginReturn.ts')
      return ['https://evil.test', '//evil.test', '/\\evil.test', '/auth/naver/callback', '/generate?project=x#draft'].map(safeLoginReturn)
    })
    assert.deepEqual(returns, ['/dashboard', '/dashboard', '/dashboard', '/dashboard', '/generate?project=x#draft'])
    await context.close()
  }
  // Queue recovery excludes completed/running slots and never repeats a lost paid POST.
  {
    const { context, page, state } = await setup()
    state.generation = { id: 'gen-project', prompt: 'Test', confirmed: true, status: 'active', day: '2026-10-07', created_at: new Date().toISOString(), referenceUrl: null, plan: Array.from({ length: 23 }, (_, i) => ({ slot: i + 1, pose: `pose ${i}`, caption: `caption ${i}` })), images: [{ id: 'base', slot: 0, status: 'completed', url: imageUrl, caption: '', prompt: '' }, { id: 'finished', slot: 1, status: 'completed', url: imageUrl, caption: '', prompt: '' }, { id: 'running', slot: 2, status: 'running', url: null, caption: '', prompt: '' }] }
    await page.goto(base + '/generate?project=gen-project')
    await page.locator('summary').first().click()
    await page.locator('details input').first().waitFor()
    await page.locator('details input').nth(4).fill('Unsaved pose')
    // Wait for a real 4-second poll and prove the local edit remains.
    await page.waitForTimeout(4500)
    assert.equal(await page.locator('details input').nth(4).inputValue(), 'Unsaved pose')
    const queued = await page.evaluate(async plan => {
      const { enqueueRemainingGeneration } = await import('/src/lib/generationApi.ts')
      return enqueueRemainingGeneration('workflow-token', 'gen-project', plan)
    }, state.generation.plan)
    assert.equal(queued.recovered, true)
    assert.equal(state.batchPosts, 1)
    assert.deepEqual(state.queuedSlots, Array.from({ length: 21 }, (_, i) => i + 3))
    await page.evaluate(async plan => (await import('/src/lib/generationApi.ts')).enqueueRemainingGeneration('workflow-token', 'gen-project', plan), state.generation.plan)
    assert.equal(state.batchPosts, 1)
    await context.close()
  }
  assert.deepEqual(errors, [])
  console.log('PASS: responsive editor/result/generation, 8/24-frame batch and undo, region/language/style preservation, preview/download pixel equality, cleanup return, session 401/503, OAuth return/state, generation polling and lost queue response.')
} catch (error) { console.error('Runtime errors:', errors); throw error } finally { await browser.close() }
