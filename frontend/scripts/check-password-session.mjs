import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const base = process.env.PREVIEW_URL ?? 'http://127.0.0.1:5173'
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined })
try {
  for (const status of [200, 400]) {
    const context = await browser.newContext()
    const user = { id: 'fixture-user', email: 'fixture@example.invalid', name: 'Fixture', avatarUrl: null, signupMethod: 'email', hasPassword: true }
    await context.addInitScript(user => {
      localStorage.setItem('glocalizer:siteLang', 'ko')
      localStorage.setItem('glocalizer:authToken', 'old-session')
      localStorage.setItem('glocalizer:authUser', JSON.stringify(user))
    }, user)
    let changes = 0
    await context.route('https://**/*', route => route.abort())
    await context.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (path.endsWith('/auth/me/password')) {
        changes++
        assert.deepEqual(route.request().postDataJSON(), { currentPassword: 'old-password', newPassword: 'new-password' })
        return route.fulfill({status, json:status === 200 ? { success:true } : {error:{message:'Current password incorrect'}}})
      }
      return route.fulfill({status:200,json:path.endsWith('/auth/me') ? { user } : {projects:[],showcases:[]}})
    })
    const page = await context.newPage()
    await page.goto(base + '/account')
    await page.getByRole('button', {name:'비밀번호 변경',exact:true}).click()
    await page.locator('#current-password').fill('old-password')
    await page.locator('#new-password').fill('new-password')
    await page.locator('#confirm-password').fill('new-password')
    await page.getByRole('button', {name:'변경하기',exact:true}).click()
    if (status === 200) {
      await page.waitForURL(base + '/')
      assert.equal(await page.evaluate(()=>localStorage.getItem('glocalizer:authToken')),null)
      assert.equal(await page.evaluate(()=>localStorage.getItem('glocalizer:authUser')),null)
    } else {
      await page.getByText('Current password incorrect',{exact:true}).waitFor()
      assert.equal(new URL(page.url()).pathname,'/account')
      assert.equal(await page.evaluate(()=>localStorage.getItem('glocalizer:authToken')),'old-session')
    }
    assert.equal(changes,1)
    await context.close()
  }
  console.log('PASS: password success clears the current session; failure retains it.')
} finally { await browser.close() }
