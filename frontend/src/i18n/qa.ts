import type { SiteLang } from './translations'

const copy = {
  qaPageTitle: ['QA 검사 결과', 'QA results', 'QA検査結果', 'QA 检查结果'],
  comingSoon: ['준비 중인 화면이에요.', 'This page is coming soon.', '準備中の画面です。', '页面准备中。'],
}

export function qaCopy(lang: SiteLang) {
  const index = ({ ko: 0, en: 1, ja: 2, zh: 3 })[lang]
  return Object.fromEntries(Object.entries(copy).map(([key, values]) => [key, values[index]])) as Record<keyof typeof copy, string>
}

export type QaCopy = ReturnType<typeof qaCopy>
