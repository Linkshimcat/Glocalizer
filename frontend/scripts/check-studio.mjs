import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
import { createRequire } from 'node:module'
const sharp = createRequire(new URL('../../backend/package.json', import.meta.url))('sharp')

// Deterministic fixtures; no production accounts, Naver credentials or paid AI calls.
const base = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5173'
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined })
const errors = []
const user = { id: 'workflow-user', email: 'studio-fixture@example.test', name: 'Workflow', avatarUrl: null, signupMethod: 'naver' }
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
    if (path === '/projects') return reply({ projects: Array.from({length:3},(_,i)=>({id:'workflow-project'+i,name:['첫 번째 작품','일상 속 작은 행복','오늘도 파이팅'][i],status:'completed',resultReady:false,targetLanguages:['en','ja'],imageCount:8,createdAt:'2026-10-07T08:00:00Z',updatedAt:'2026-10-07T08:00:00Z',thumbnailUrl:'/src/assets/studio/hero-character.png'})) })
    if (path === '/ogq/stickers') return reply({stickers: []}); if (path === '/landing/showcases') return reply({ showcases: [] })
    return reply({})
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  return { context, page, state }
}


await mkdir('/tmp/glocalizer-studio-qa',{recursive:true});
let cases=0;
for (const width of [360,390,768,1280,1440]) {
 for (const lang of ['ko','en','ja','zh']) {
  const {context,page}=await setup({width});
  await page.setViewportSize({width,height:1024});
  await context.addInitScript(lang=>localStorage.setItem('glocalizer:siteLang',lang),lang);
  for (const path of ['/','/dashboard','/editor','/result','/generate','/review','/localize','/account','/archive']) {
   await page.goto(base+path,{waitUntil:'domcontentloaded'});
   await page.locator('h1,textarea').first().waitFor();
   await page.evaluate(()=>document.fonts.ready);
   await page.waitForTimeout(100);
   const sizes=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(sizes.scroll<=sizes.width+1,JSON.stringify({path,lang,...sizes}));
   if(lang==='ko') await page.screenshot({path:'/tmp/glocalizer-studio-qa/'+(path==='/'?'landing':path.slice(1))+'-'+width+'.png'});
   cases++;
  }
  await context.close();
 }
 console.log('PASS width',width);
}
assert.deepEqual(errors,[]);
console.log('PASS',cases,'studio page/locale/viewport cases, no overflow or runtime errors');
await browser.close();
