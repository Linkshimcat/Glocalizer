import type { SiteLang } from './translations'

const copy = {
  title: ['국가별 인기 이모티콘', 'Popular stickers by country', '国・地域別の人気スタンプ', '各国热门表情'],
  subtitle: [
    '출시 전 시장 조사에 참고하세요. 나라마다 지금 인기 있는 스티커를 모아 보여드려요.',
    'Use this for market research before launch. See what stickers are trending in each country right now.',
    'リリース前の市場調査にご活用ください。各国・地域で今人気のスタンプをまとめて表示します。',
    '发布前做市场调研时参考。汇总展示各国当下热门的表情。',
  ],
  tabKorea: ['한국', 'Korea', '韓国', '韩国'],
  tabJapan: ['일본', 'Japan', '日本', '日本'],
  tabChina: ['중국', 'China', '中国', '中国'],
  tabUs: ['미국', 'US', 'アメリカ', '美国'],
  sourceOgq: ['OGQ 마켓 인기순', 'OGQ Market · Popular', 'OGQ マーケット・人気順', 'OGQ 商店 · 热门'],
  sourceGiphy: ['GIPHY 제공 트렌딩 스티커', 'Trending stickers via GIPHY', 'GIPHY提供のトレンドスタンプ', 'GIPHY 提供的热门表情'],
  empty: ['지금은 불러올 수 없어요.', 'Unable to load right now.', '現在読み込めません。', '暂时无法加载。'],
  retry: ['다시 시도', 'Retry', '再試行', '重试'],
  giphyKeyMissing: [
    'GIPHY API 키가 설정되지 않았어요. 환경변수를 확인해주세요.',
    'The GIPHY API key is not configured. Please check your environment variables.',
    'GIPHY APIキーが設定されていません。環境変数を確認してください。',
    'GIPHY API 密钥未配置，请检查环境变量。',
  ],
} satisfies Record<string, [string, string, string, string]>

export function stickerTrendsCopy(lang: SiteLang) {
  const index = ({ ko: 0, en: 1, ja: 2, zh: 3 })[lang]
  return Object.fromEntries(Object.entries(copy).map(([key, values]) => [key, values[index]])) as Record<keyof typeof copy, string>
}
