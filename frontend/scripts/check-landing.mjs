import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { chromium } from 'playwright'
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined}),dir='/tmp/glocalizer-restyle-qa',errors=[],consoleErrors=[]
await fs.mkdir(dir,{recursive:true})
const base=process.env.PREVIEW_URL??'http://127.0.0.1:5173'
const heroFixture='data:image/png;base64,'+(await fs.readFile(new URL('../src/assets/studio/hero-character.png',import.meta.url))).toString('base64')
const resultFixture='data:image/png;base64,'+(await fs.readFile(new URL('../src/assets/LandingAssets/Local.png',import.meta.url))).toString('base64')
async function setup({width=1440,height=1024,lang='ko',motion='no-preference',state='empty'}={}){
 let ogqState=state
 const context=await browser.newContext({viewport:{width,height},reducedMotion:motion})
 await context.addInitScript(lang=>localStorage.setItem('glocalizer:siteLang',lang),lang)
 await context.route('https://**/*',r=>r.abort())
 await context.route('**/api/v1/**',r=>{
  const p=new URL(r.request().url()).pathname
  if(p.endsWith('/ogq/stickers'))return r.fulfill({status:ogqState==='failure'?503:200,json:{stickers:ogqState==='success'?Array.from({length:12},(_,i)=>({assetId:'sticker-'+i,title:'Sticker '+i,thumbnailUrl:heroFixture})):[]}})
  if(p.endsWith('/landing/showcases'))return r.fulfill({status:state==='failure'?503:200,json:{showcases:state==='success'?[{id:'test',kind:'localization',languageCode:'en',originalUrl:heroFixture,resultUrl:resultFixture,sortOrder:0}]:[]}})
  if(p.endsWith('/generation/config'))return r.fulfill({json:{enabled:true}})
  if(p.endsWith('/auth/me'))return r.fulfill({status:401,json:{error:{message:'Not signed in'}}})
  return r.fulfill({json:{projects:[]}})
 })
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource'))consoleErrors.push(m.text())})
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(650)
 return {context,page,setOgqState:value=>{ogqState=value}}
}
async function overflow(page,label){
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow '+label)
 const bad=await page.locator('main h1,main h2,main h3,header').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.left<-.5||r.right>innerWidth+.5||n.scrollWidth>n.clientWidth+1}).map(n=>({text:n.textContent,rect:n.getBoundingClientRect().toJSON(),scroll:n.scrollWidth,client:n.clientWidth})))
 assert.deepEqual(bad,[],'text bounds '+label)
}
async function scene(page,i){await page.evaluate(i=>{const s=document.querySelector('.remake-story'),h=document.querySelector('header').offsetHeight;scrollTo(0,s.offsetTop-h+(s.offsetHeight-innerHeight+h)*(i/3+.1))},i);await page.waitForTimeout(550)}
let cases=0
try {
for(const width of [360,390,768,1280,1440])for(const lang of ['ko','en','ja','zh']){
 const {page,context}=await setup({width,height:width<600?844:1024,lang})
 const label=`${width} ${lang}`
 assert.equal(await page.locator('html').getAttribute('lang'),lang)
 assert.equal(await page.locator('.remake-hero-art').count(),1)
 assert.equal(await page.locator('.remake-translation-strip').count(),1)
 assert.equal(await page.locator('video').evaluate(v=>v.paused&&v.controls&&v.muted&&v.playsInline&&!v.autoplay),true)
 const h=await page.locator('header').boundingBox(),title=await page.locator('h1').boundingBox();assert.ok(title.y>=h.height)
 await overflow(page,label)
 await page.screenshot({path:`${dir}/matrix-hero-${width}-${lang}.png`})
 // Aspect ratio, metadata and presentation are checked at all 20 combinations.
 await page.locator('video').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('video').readyState>=2)
 const video=await page.locator('video').evaluate(v=>{const r=v.getBoundingClientRect(),s=getComputedStyle(v);return{width:r.width,height:r.height,w:v.videoWidth,h:v.videoHeight,duration:v.duration,filter:s.filter,fit:s.objectFit,transform:s.transform}})
 assert.ok(Math.abs(video.width/video.height-16/9)<.01);assert.ok(video.width<=1120.1);assert.equal(video.w,1920);assert.equal(video.h,1080);assert.ok(video.duration>18&&video.duration<19);assert.equal(video.filter,'none');assert.equal(video.transform,'none');assert.equal(video.fit,'contain')
 for(let i=0;i<3;i++){
  await scene(page,i)
  const sceneTitles={ko:['이모티콘 생성','다국어 현지화','출시 전 검토'],en:['Sticker creation','Caption localization','Pre-release review'],ja:['スタンプ生成','多言語ローカライズ','公開前チェック'],zh:['表情生成','多语言本地化','发布前检查']}
  assert.equal(await page.locator('.remake-scene-copy h2').innerText(),sceneTitles[lang][i])
  await overflow(page,`${label} scene ${i}`)
  const b=await page.evaluate(()=>{const c=document.querySelector('.remake-scene-copy').getBoundingClientRect(),d=document.querySelector('.remake-device').getBoundingClientRect(),h=document.querySelector('header').getBoundingClientRect();return{copy:c.toJSON(),device:d.toJSON(),header:h.bottom,height:innerHeight}})
  assert.ok(b.copy.top>=b.header-1,JSON.stringify({label,i,...b}));assert.ok(b.device.bottom<=b.height+1,JSON.stringify({label,i,...b}))
  if(width<=900)assert.ok(b.device.top>=b.copy.bottom-1,JSON.stringify({label,i,...b}))
  if(width<=900) {
   const clearance=await page.locator('.remake-product-window').evaluate(n=>{const windowRect=n.getBoundingClientRect(),screen=n.querySelector('.remake-product-screen').getBoundingClientRect();return {top:screen.top-windowRect.top,height:windowRect.height}})
   assert.ok(clearance.top>=clearance.height*.049,`${label}: phone content clears camera cutout`)
  }

  assert.equal(await page.locator(width<=900?'.remake-device-frame-mobile':'.remake-device-frame-desktop').isVisible(),true)
  if(lang==='ko')assert.equal(await page.locator('.remake-product-capture').evaluate(n=>n.naturalWidth),width<=900?390:1280)
  else assert.equal(await page.locator('.remake-product-live').getAttribute('src'),['/generate','/localize','/review'][i])
 }
 await page.locator('.remake-workflow-grid').scrollIntoViewIfNeeded();await page.waitForTimeout(850)
 const cards=page.locator('.remake-workflow-grid article')
 assert.equal(await cards.count(),3)
 for(let i=0;i<3;i++){
  await cards.nth(i).scrollIntoViewIfNeeded();await page.waitForTimeout(450)
  assert.equal(await cards.nth(i).getAttribute('data-visible'),'true')
  assert.equal(await cards.nth(i).locator(':scope > :first-child').evaluate(n=>n.tagName),'IMG')
  assert.equal(await cards.nth(i).locator('a').getAttribute('href'),['/generate','/localize','/review'][i])
 }
 await page.locator('.remake-final').scrollIntoViewIfNeeded();await overflow(page,`${label} final`)
 assert.equal(await page.locator('.remake-final').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(233, 245, 238)')
 await page.evaluate(()=>scrollTo(0,0));await page.locator('.remake-scroll-button').click();await page.waitForTimeout(1300)
 assert.ok((await page.locator('.remake-story').boundingBox()).y<=h.height+2)
 await page.locator('.remake-final button').click();await page.waitForURL('**/dashboard')
 await context.close();cases++;console.log('matrix passed',label)
}
// The rotating headline reserves its longest phrase and pauses outside the hero.
{
 const {page,context}=await setup({width:390})
 const seen=new Set(),sizes=new Set()
 for(let i=0;i<22;i++) {
  const sample=await page.locator('.remake-hero-roll').evaluate(n=>{
   const r=n.getBoundingClientRect()
   return {width:r.width,height:r.height,visible:[...n.querySelectorAll('.animate-roll-word')].filter(word=>{const b=word.getBoundingClientRect();return b.top>=r.top&&b.bottom<=r.bottom}).map(word=>word.textContent)}
  })
  sample.visible.forEach(word=>seen.add(word));sizes.add(`${sample.width}/${sample.height}`)
  await page.waitForTimeout(400)
 }
 assert.deepEqual([...seen].sort(),['만드세요','현지화하세요','검토하세요'].sort())
 assert.equal(sizes.size,1,'headline dimensions stay fixed')
 await page.locator('.remake-video-intro').evaluate(n=>n.scrollIntoView({block:'start'}))
 await page.waitForFunction(()=>document.querySelector('.remake-hero').dataset.motionPaused==='true')
 assert.equal(await page.locator('.remake-hero .animate-roll-word').first().evaluate(n=>getComputedStyle(n).animationPlayState),'paused')
 const before=await page.locator('.remake-hero .animate-roll-word').first().evaluate(n=>getComputedStyle(n).transform)
 await page.waitForTimeout(200)
 assert.equal(await page.locator('.remake-hero .animate-roll-word').first().evaluate(n=>getComputedStyle(n).transform),before)
 await page.evaluate(()=>scrollTo(0,0))
 await page.waitForFunction(()=>document.querySelector('.remake-hero').dataset.motionPaused==='false')
 await context.close()
}
// Native controls: half-visible autoplay, leaving/returning, manual pause, seek, end and replay.
{
 const {page,context}=await setup()
 const v=page.locator('video')
 const position=async fraction=>{await v.evaluate((n,f)=>{const r=n.getBoundingClientRect();scrollTo(0,scrollY+r.top-innerHeight+r.height*f)},fraction);await page.waitForTimeout(300)}
 await position(.49);assert.equal(await v.evaluate(n=>n.paused),true)
 await position(.55);await page.waitForFunction(()=>!document.querySelector('video').paused&&document.querySelector('video').currentTime>0)
 await page.evaluate(()=>scrollTo(0,0));await page.waitForFunction(()=>document.querySelector('video').paused)
 const stopped=await v.evaluate(n=>n.currentTime);await page.waitForTimeout(150);assert.equal(await v.evaluate(n=>n.currentTime),stopped)
 await v.scrollIntoViewIfNeeded();await page.waitForFunction(()=>!document.querySelector('video').paused)
 // Exercise browser-owned play/pause button rather than dispatching a synthetic event.
 let box=await v.boundingBox();await page.mouse.click(box.x+24,box.y+box.height-48);await page.waitForFunction(()=>document.querySelector('video').paused)
 await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(150);await v.scrollIntoViewIfNeeded();await page.waitForTimeout(300);assert.equal(await v.evaluate(n=>n.paused),true,'respect explicit user pause')
 box=await v.boundingBox();await page.mouse.click(box.x+24,box.y+box.height-48);await page.waitForFunction(()=>!document.querySelector('video').paused)
 await page.mouse.click(box.x+box.width*.5,box.y+box.height-22);await page.waitForFunction(()=>document.querySelector('video').currentTime>7)
 await v.evaluate(n=>{n.currentTime=n.duration-.1;return n.play()});await page.waitForFunction(()=>document.querySelector('video').ended)
 await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(150);await v.scrollIntoViewIfNeeded();await page.waitForTimeout(250);assert.equal(await v.evaluate(n=>n.ended),true,'no automatic loop')
 await page.locator('.remake-video-replay').click();await page.waitForFunction(()=>document.querySelector('video').currentTime<1&&!document.querySelector('video').paused)
 await context.close();console.log('native video controls passed')
}
for(const width of [390,1440])for(const lang of ['ko','en','ja','zh']){
 const {page,context}=await setup({width,lang,motion:'reduce'})
 assert.equal(await page.locator('.remake-story-scene').count(),3)
 assert.equal(await page.locator('.remake-hero .animate-roll-word').first().evaluate(n=>getComputedStyle(n).animationName),'none')
 assert.equal(await page.locator('.remake-hero .roll-layer').nth(1).evaluate(n=>getComputedStyle(n).opacity),'0')
 assert.equal(await page.locator('.remake-workflow-grid article[data-visible="true"]').count(),3)
 await page.locator('video').scrollIntoViewIfNeeded();await page.waitForTimeout(300)
 assert.equal(await page.locator('video').evaluate(n=>n.paused),true)
 await page.locator('.remake-video-replay').click();await page.waitForFunction(()=>!document.querySelector('video').paused)
 await page.evaluate(()=>scrollTo(0,0));await page.waitForFunction(()=>document.querySelector('video').paused)
 await page.locator('video').scrollIntoViewIfNeeded();await page.waitForTimeout(200);assert.equal(await page.locator('video').evaluate(n=>n.paused),true)
 await overflow(page,`reduced ${width} ${lang}`)
 await context.close()
}
for(const state of ['success','empty','failure']){
 const {page,context,setOgqState}=await setup({state})
 if(state==='success'){
  await page.locator('.remake-cases').waitFor();assert.equal(await page.locator('.remake-case-card').count(),1)
  const slider=page.locator('.remake-case-compare input');await slider.scrollIntoViewIfNeeded();await slider.focus();await page.keyboard.press('ArrowRight');assert.equal(await slider.inputValue(),'51')
  assert.ok((await page.locator('.remake-case-compare img').nth(1).getAttribute('style')).includes('51%'))
  await page.locator('.remake-ogq-proof').scrollIntoViewIfNeeded();assert.equal(await page.locator('.ogq-tilt-card img').count(),12)
  await page.screenshot({path:`${dir}/ogq-success.png`})
 }else{
  await page.locator('.ogq-gallery-error').waitFor();assert.equal(await page.locator('.remake-cases').count(),0)
  assert.equal(await page.locator('img[src*="ogq-gallery-reference"]').count(),0)
  setOgqState('success')
  await page.locator('.ogq-gallery-error button').click()
  await page.locator('.ogq-tilt-card img').first().waitFor()
  await page.locator('.ogq-tilt-scene').scrollIntoViewIfNeeded()
  await page.waitForFunction(()=>document.querySelector('.ogq-tilt-scene').classList.contains('is-visible'))
  assert.equal(await page.locator('.ogq-tilt-card img').count(),12)
  const scene=await page.locator('.ogq-tilt-scene').boundingBox()
  await page.mouse.move(scene.x+scene.width*.7,scene.y+scene.height*.5)
  await page.waitForFunction(()=>document.querySelector('.ogq-tilt-scene').classList.contains('is-interacting'))

 }
 await context.close()
}
{
 const {page,context}=await setup({width:768,height:600})
 assert.equal(await page.locator('.remake-story-scene').count(),3);await overflow(page,'short viewport');await context.close()
}
// Header navigation, hero CTA, workflow links, and language switching stay usable.
{
 const {page,context}=await setup({width:390})
 for(const [lang,label] of [['en','EN'],['ja','JP'],['zh','ZH'],['ko','KR']]){
  await page.locator('button[aria-haspopup="listbox"]').click();await page.getByRole('option').filter({hasText:label}).click()
  assert.equal(await page.locator('html').getAttribute('lang'),lang);await overflow(page,'switch '+lang)
 }
 for(const [selector,path] of [['.remake-hero-actions > button:first-child','/dashboard'],['header a[href="/service"]','/service'],['header a[href="/login"]','/login'],['.remake-workflow-link:nth-of-type(1)','/login?next=%2Fgenerate%3F']]){
  await page.goto(base+'/');await page.locator(selector).first().click();await page.waitForURL(url=>url.pathname+url.search===path)
 }
 for(const i of [1,2]){await page.goto(base+'/');await page.locator('.remake-workflow-link').nth(i).click();await page.waitForURL('**'+['/generate','/localize','/review'][i])}
 await context.close()
}
assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[])
await fs.writeFile(dir+'/checks.json',JSON.stringify({responsiveLocaleCases:cases,serviceSceneChecks:cases*3,reducedMotionCases:8,ogqStates:3,nativeMediaControls:'passed',runtimeErrors:errors,consoleErrors},null,2))
console.log('PASS: 20 viewports/locales, 60 scenes, native video controls, 8 reduced-motion cases, OGQ/showcase states and navigation.')

} finally { await browser.close() }
