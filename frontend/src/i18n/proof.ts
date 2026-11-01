import type { SiteLang } from './translations'

const copy = {
  proofPageTitle: ['성능·품질 증빙', 'Performance & quality proof', '性能・品質の根拠', '性能与质量证明'],
  comingSoon: ['준비 중인 화면이에요.', 'This page is coming soon.', '準備中の画面です。', '页面准备中。'],
}

export function proofCopy(lang: SiteLang) {
  const index = ({ ko: 0, en: 1, ja: 2, zh: 3 })[lang]
  return Object.fromEntries(Object.entries(copy).map(([key, values]) => [key, values[index]])) as Record<keyof typeof copy, string>
}

export type ProofCopy = ReturnType<typeof proofCopy>
