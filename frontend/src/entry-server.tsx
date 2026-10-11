/* oxlint-disable react/only-export-components -- build-time server entry, never hot-reloaded */
import { prerender } from 'react-dom/static'
import { StaticRouter } from 'react-router-dom'
import { AppRoutes } from './App'

export { PUBLIC_PAGES, llmsTxt, pageHead, shellHead, sitemapXml } from './seo'

/** Renders one public route to HTML once every lazy page under it has loaded. */
export async function render(path: string): Promise<string> {
  const { prelude } = await prerender(
    <StaticRouter location={path}>
      <AppRoutes />
    </StaticRouter>,
  )
  return new Response(prelude).text()
}
