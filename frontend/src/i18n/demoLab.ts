import type { SiteLang } from './translations'

const copy = {
  demoLabPageTitle: ['3분 샘플 체험', '3-minute sample tour', '3分サンプル体験', '3 分钟示例体验'],
  comingSoon: ['준비 중인 화면이에요.', 'This page is coming soon.', '準備中の画面です。', '页面准备中。'],
}

export function demoLabCopy(lang: SiteLang) {
  const index = ({ ko: 0, en: 1, ja: 2, zh: 3 })[lang]
  return Object.fromEntries(Object.entries(copy).map(([key, values]) => [key, values[index]])) as Record<keyof typeof copy, string>
}

export type DemoLabCopy = ReturnType<typeof demoLabCopy>
