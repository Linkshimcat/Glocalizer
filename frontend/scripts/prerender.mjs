// Turns the client build into static HTML for the public pages so crawlers and AI agents read real content.
// Runs after `vite build` and `vite build --ssr src/entry-server.tsx --outDir dist-ssr` (see package.json).
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

// React picks its production build from NODE_ENV when the server bundle first imports it.
process.env.NODE_ENV ??= 'production'

const dist = new URL('../dist/', import.meta.url)
const serverDir = new URL('../dist-ssr/', import.meta.url)
const { PUBLIC_PAGES, llmsTxt, pageHead, render, shellHead, sitemapXml } = await import(new URL('entry-server.js', serverDir))

const template = await fs.readFile(new URL('index.html', dist), 'utf8')
const SEO_BLOCK = /<!--seo-->[\s\S]*?<!--\/seo-->/
const ROOT = '<div id="root"></div>'
assert.match(template, SEO_BLOCK, 'index.html must wrap its per-page tags in <!--seo--> ... <!--/seo-->')
assert.ok(template.includes(ROOT), `index.html must contain ${ROOT}`)

// Every route without its own HTML falls back to this client-rendered shell (vercel.json rewrites).
await fs.writeFile(new URL('spa.html', dist), template.replace(SEO_BLOCK, shellHead()))

// A prerendered page is readable and its links work before any JS runs, so the app bundle starts after the page
// has loaded (or on the first interaction, or after 3 s) instead of competing with the hero image and CSS for bandwidth.
const ENTRY = /<script type="module" crossorigin src="([^"]+)"><\/script>/
const MODULE_PRELOADS = /\s*<link rel="modulepreload" crossorigin href="[^"]+">/g
const entry = template.match(ENTRY)
assert.ok(entry, 'index.html must load the app through a single module script')
const deferredEntry = `<script>(() => {
      let started = false
      const start = () => {
        if (started) return
        started = true
        const script = document.createElement('script')
        script.type = 'module'
        script.src = ${JSON.stringify(entry[1])}
        document.head.append(script)
      }
      addEventListener('load', () => setTimeout(start), { once: true })
      for (const type of ['pointerdown', 'keydown', 'touchstart']) addEventListener(type, start, { once: true, passive: true })
      setTimeout(start, 3000)
    })()</script>`
const pageTemplate = template.replace(ENTRY, deferredEntry).replace(MODULE_PRELOADS, '')

for (const page of PUBLIC_PAGES) {
  const app = await render(page.path)
  assert.ok(app.length > 0, `${page.path} rendered empty HTML`)
  const html = pageTemplate.replace(SEO_BLOCK, pageHead(page)).replace(ROOT, `<div id="root">${app}</div>`)
  const file = page.path === '/' ? new URL('index.html', dist) : new URL(`${page.path.slice(1)}/index.html`, dist)
  await fs.mkdir(new URL('.', file), { recursive: true })
  await fs.writeFile(file, html)
  console.log(`prerendered ${page.path} (${(html.length / 1024).toFixed(1)} kB)`)
}

await fs.writeFile(new URL('sitemap.xml', dist), sitemapXml())
await fs.writeFile(new URL('llms.txt', dist), llmsTxt())
await fs.rm(serverDir, { recursive: true, force: true })
