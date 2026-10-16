// GIPHY 공식 정책상 Trending 호출은 서버 프록시·캐싱 없이 브라우저에서 직접 해야 한다.
// 그래서 다른 API 클라이언트(lib/api.ts)처럼 우리 백엔드를 거치지 않고 GIPHY를 바로 호출한다.
export interface TrendingSticker {
  id: string
  title: string
  thumbnailUrl: string
}

interface GiphyTrendingResponse {
  data: Array<{
    id: string
    title: string
    images: { fixed_width: { url: string } }
  }>
}

export async function fetchTrendingStickers(countryCode: 'JP' | 'CN' | 'US', limit = 24): Promise<TrendingSticker[]> {
  const key = import.meta.env.VITE_GIPHY_API_KEY
  if (!key) throw new Error('GIPHY API 키가 설정되지 않았어요.')

  const search = new URLSearchParams({ api_key: key, country_code: countryCode, rating: 'g', limit: String(limit) })
  const response = await fetch(`https://api.giphy.com/v1/stickers/trending?${search}`)
  if (!response.ok) throw new Error(`GIPHY 요청에 실패했어요 (${response.status}).`)

  const { data } = (await response.json()) as GiphyTrendingResponse
  return data.map(item => ({ id: item.id, title: item.title, thumbnailUrl: item.images.fixed_width.url }))
}
