import assert from 'node:assert/strict'
import { chromium } from 'playwright'

// Run against a local Vite server. Uses bundled Chromium unless CHROME_PATH is set.
const base = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5173'
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined })
const errors = []
const names = {
  ko: ['개인정보처리방침', '서비스 이용약관'],
  en: ['Privacy Policy', 'Terms of Service'],
  ja: ['プライバシーポリシー', '利用規約'],
  zh: ['隐私政策', '服务条款'],
}
try {
  for (const width of [320, 375, 768, 1280]) {
    for (const lang of Object.keys(names)) {
      const context = await browser.newContext({ viewport: { width, height: 900 } })
      await context.addInitScript(lang => localStorage.setItem('glocalizer:siteLang', lang), lang)
      const page = await context.newPage()
      page.on('pageerror', error => errors.push(error.message))
      for (const [index, path] of ['/privacy', '/terms', '/service'].entries()) {
        await page.goto(base + path, { waitUntil: 'domcontentloaded' })
        await page.locator('h1').waitFor()
        assert.equal(await page.locator('html').getAttribute('lang'), lang)
        assert.ok((await page.title()).endsWith(' | Glocalizer'))
        if (index < 2) {
          assert.equal(await page.locator('h1').innerText(), names[lang][index])
          assert.equal(await page.title(), `${names[lang][index]} | Glocalizer`)
          assert.equal(await page.locator('main section').count(), index === 0 ? 8 : 10)
          const links = page.locator('main a[href^="#legal-section-"]')
          assert.equal(await links.count(), index === 0 ? 8 : 10)
          for (const href of await links.evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))) {
            assert.equal(await page.locator(href).count(), 1)
          }
          await links.last().click()
          assert.ok(new URL(page.url()).hash.startsWith('#legal-section-'))
          assert.equal(await page.locator('main a[href^="mailto:"]').count(), 1)
        } else {
          assert.equal(await page.locator('main article').count(), 4)
          for (const href of ['/generate', '/localize', '/review', '/archive']) {
            assert.equal(await page.locator(`main a[href="${href}"]`).count(), 1)
          }
          assert.equal(await page.locator('details').count(), 5)
          await page.locator('summary').first().click()
          assert.equal(await page.locator('details[open]').count(), 1)
        }
        assert.equal(await page.locator('footer a[href="/privacy"]').innerText(), names[lang][0])
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${path} ${lang} ${width}`)
        if (lang !== 'ko') {
          assert.equal(await page.locator('body').evaluate(node => /[가-힣]/.test(node.innerText)), false)
          assert.equal(await page.locator('[aria-label]').evaluateAll(nodes => nodes.some(node => /[가-힣]/.test(node.getAttribute('aria-label')))), false)
        }
      }
      await context.close()
    }
  }
  const page = await browser.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(base + '/privacy', { waitUntil: 'domcontentloaded' })
  for (const [lang, label] of [['en', 'EN'], ['ja', 'JP'], ['zh', 'ZH'], ['ko', 'KR']]) {
    await page.locator('button[aria-haspopup="listbox"]').click()
    await page.getByRole('option').filter({ hasText: label }).click()
    assert.equal(await page.locator('h1').innerText(), names[lang][0])
    await page.reload()
    await page.locator('h1').waitFor()
    assert.equal(await page.locator('h1').innerText(), names[lang][0])
  }
  await page.locator('main a[href="/terms"]').click()
  await page.getByRole('heading', { name: names.ko[1], exact: true }).waitFor()
  await page.close()

  const blocked = await browser.newContext()
  await blocked.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'getItem', { value() { throw new DOMException('Blocked', 'SecurityError') } })
    Object.defineProperty(Storage.prototype, 'setItem', { value() { throw new DOMException('Blocked', 'SecurityError') } })
  })
  const blockedPage = await blocked.newPage()
  blockedPage.on('pageerror', error => errors.push(error.message))
  await blockedPage.goto(base + '/privacy')
  await blockedPage.getByRole('heading', { name: names.ko[0], exact: true }).waitFor()
  await blockedPage.locator('button[aria-haspopup="listbox"]').click()
  await blockedPage.getByRole('option').filter({ hasText: 'EN' }).click()
  assert.equal(await blockedPage.locator('h1').innerText(), names.en[0])
  assert.deepEqual(errors, [])
  console.log('PASS: 48 locale/route/viewport cases, all language switches and persistence, TOC/FAQ navigation, localized metadata/accessibility, blocked storage, and no runtime errors.')
} finally {
  await browser.close()
}
