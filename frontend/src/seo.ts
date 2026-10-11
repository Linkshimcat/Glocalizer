import { LEGAL_CONTACT, legalDict } from './i18n/legal'
import { legalUi } from './i18n/legalUi'
import { serviceDict } from './i18n/service'
import { translations } from './i18n/translations'

/** Build-time SEO for the prerendered public pages: head tags, JSON-LD, sitemap.xml and llms.txt. */

export const SITE_URL = 'https://glocalizer.vercel.app'
const SITE_NAME = 'Glocalizer'
const HOME_TITLE = 'Glocalizer – 이모티콘 한글을 전 세계 언어로 현지화'
const HOME_DESCRIPTION = '이모티콘 속 한글을 영어·일본어·중국어 등 자연스러운 현지 표현으로 바꿔주는 AI 이모티콘 현지화 서비스, Glocalizer.'
const GITHUB_URL = 'https://github.com/Linkshimcat/Glocalizer'

type JsonLd = Record<string, unknown>

export interface PublicPage {
  path: string
  title: string
  description: string
  /** false keeps a placeholder page out of search results and the sitemap. */
  indexable: boolean
  jsonLd: JsonLd[]
}

const service = serviceDict.ko
const legal = legalDict.ko
const ui = legalUi.ko

const organization: JsonLd = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/favicon.png`,
  email: LEGAL_CONTACT,
  sameAs: [GITHUB_URL],
}

const website: JsonLd = {
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  inLanguage: ['ko', 'en', 'ja', 'zh'],
  publisher: { '@id': `${SITE_URL}/#organization` },
}

const application: JsonLd = {
  '@type': 'WebApplication',
  '@id': `${SITE_URL}/#app`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  description: HOME_DESCRIPTION,
  applicationCategory: 'DesignApplication',
  operatingSystem: 'Web',
  inLanguage: 'ko',
  featureList: service.features.map(feature => `${feature.title}: ${feature.description}`),
  publisher: { '@id': `${SITE_URL}/#organization` },
}

const faq: JsonLd = {
  '@type': 'FAQPage',
  mainEntity: service.faq.map(item => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer },
  })),
}

export const PUBLIC_PAGES: PublicPage[] = [
  { path: '/', title: HOME_TITLE, description: HOME_DESCRIPTION, indexable: true, jsonLd: [organization, website, application] },
  { path: '/service', title: `${service.title} | ${SITE_NAME}`, description: service.intro, indexable: true, jsonLd: [organization, faq] },
  { path: '/pricing', title: `가격 | ${SITE_NAME}`, description: translations.ko.pricingDescription, indexable: false, jsonLd: [] },
  { path: '/support', title: `${ui.supportTitle} | ${SITE_NAME}`, description: ui.supportDescription, indexable: true, jsonLd: [organization] },
  { path: '/privacy', title: `${legal.privacy.title} | ${SITE_NAME}`, description: legal.privacy.description, indexable: true, jsonLd: [] },
  { path: '/terms', title: `${legal.terms.title} | ${SITE_NAME}`, description: legal.terms.description, indexable: true, jsonLd: [] },
]

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const pageUrl = (path: string) => `${SITE_URL}${path === '/' ? '/' : path}`

/** Per-page tags that replace the `<!--seo-->` block of index.html. */
export function pageHead(page: PublicPage): string {
  const title = escapeHtml(page.title)
  const description = escapeHtml(page.description)
  const url = pageUrl(page.path)
  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    page.indexable ? `<link rel="canonical" href="${url}" />` : '<meta name="robots" content="noindex" />',
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
  ]
  if (page.jsonLd.length > 0) {
    // `<` is escaped so text inside the JSON can never close the script element.
    const graph = JSON.stringify({ '@context': 'https://schema.org', '@graph': page.jsonLd }).replace(/</g, '\\u003c')
    tags.push(`<script type="application/ld+json">${graph}</script>`)
  }
  return tags.join('\n    ')
}

/** Head for the client-rendered shell that serves every other route (workspace, login, 404). */
export function shellHead(): string {
  return [
    `<title>${escapeHtml(HOME_TITLE)}</title>`,
    `<meta name="description" content="${escapeHtml(HOME_DESCRIPTION)}" />`,
    '<meta name="robots" content="noindex" />',
  ].join('\n    ')
}

export function sitemapXml(): string {
  const urls = PUBLIC_PAGES.filter(page => page.indexable).map(page => `  <url><loc>${pageUrl(page.path)}</loc></url>`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
}

/** https://llmstxt.org summary so AI assistants can describe the service accurately. */
export function llmsTxt(): string {
  const link = (path: string) => PUBLIC_PAGES.find(page => page.path === path)!
  const pageLine = (path: string, label: string) => `- [${label}](${pageUrl(path)}): ${link(path).description}`
  return [
    `# ${SITE_NAME}`,
    '',
    `> ${HOME_DESCRIPTION} ${service.intro}`,
    '',
    'Glocalizer is a Korean AI service for emoticon (sticker) creators: it generates 24-sticker sets, localizes Korean text inside sticker images into English, Japanese and Chinese, and checks files against OGQ Market specs before release.',
    '',
    `## ${service.heading}`,
    '',
    ...service.features.map(feature => `- ${feature.title}: ${feature.description} ${feature.details.join(' ')}`),
    '',
    `## ${service.notesTitle}`,
    '',
    ...service.notes.map(note => `- ${note}`),
    '',
    '## Pages',
    '',
    pageLine('/', SITE_NAME),
    pageLine('/service', service.title),
    pageLine('/support', ui.supportTitle),
    '',
    '## Optional',
    '',
    pageLine('/privacy', legal.privacy.title),
    pageLine('/terms', legal.terms.title),
    `- [GitHub](${GITHUB_URL}): Source code`,
    '',
  ].join('\n')
}
