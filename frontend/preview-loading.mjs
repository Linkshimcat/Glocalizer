// Editor 로딩 화면(오로라 배경) 미리보기용 개발 스크립트.
// 백엔드 없이 로딩 상태를 고정해두고 브라우저 창을 띄운다.
//   node preview-loading.mjs                 # 창 띄우고 계속 열어둠
//   node preview-loading.mjs --shots out/    # 애니메이션 프레임만 캡처하고 종료
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:5173'
const shotsIndex = process.argv.indexOf('--shots')
const shotsDir = shotsIndex > -1 ? process.argv[shotsIndex + 1] : null

const files = [
  { id: 'mock-0', name: 'wang-pigon.png', type: 'image/png', assetId: 'asset-0', url: '', analysis: null },
]
const projectStatus = {
  projectId: 'mock-project',
  status: 'processing',
  stage: 'ocr',
  progress: 35,
  message: '번역 중',
  assets: [{ assetId: 'asset-0', status: 'processing', progress: 35 }],
}

const browser = await chromium.launch({ headless: Boolean(shotsDir) })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })

// 상태 폴링이 실패하면 로딩이 끝나버리므로, 항상 processing을 돌려준다.
await ctx.route('**/projects/**', route =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(projectStatus) }),
)

await ctx.addInitScript(({ files, projectStatus }) => {
  const P = 'glocalizer:'
  sessionStorage.setItem(P + 'files', JSON.stringify(files))
  sessionStorage.setItem(P + 'selectedFileIds', JSON.stringify(files.map(f => f.id)))
  sessionStorage.setItem(P + 'targetLangs', JSON.stringify([{ code: 'en', flag: '🇺🇸', label: 'English' }]))
  sessionStorage.setItem(P + 'projectId', JSON.stringify('mock-project'))
  sessionStorage.setItem(P + 'projectToken', JSON.stringify('mock-token'))
  sessionStorage.setItem(P + 'projectStatus', JSON.stringify(projectStatus))
  sessionStorage.setItem(P + 'projectResults', JSON.stringify(null))
  sessionStorage.setItem(P + 'resultReady', JSON.stringify(false))
  sessionStorage.setItem(P + 'styles', JSON.stringify({}))
}, { files, projectStatus })

const page = await ctx.newPage()
await page.goto(`${BASE}/editor`, { waitUntil: 'networkidle' })

if (shotsDir) {
  for (const s of [0, 5, 10, 16, 22]) {
    if (s) await page.waitForTimeout(s === 5 ? 5000 : 5000)
    await page.screenshot({ path: `${shotsDir}/aurora-${String(s).padStart(2, '0')}s.png` })
  }
  await browser.close()
} else {
  console.log('로딩 화면 미리보기 창을 띄웠어요. 창을 닫으면 종료됩니다.')
  await page.waitForEvent('close', { timeout: 0 })
  await browser.close()
}
