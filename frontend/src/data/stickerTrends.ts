/**
 * 일본/중국/미국 인기 이모티콘 — 팀원이 직접 조사해서 채워 넣는 수동 큐레이션 데이터.
 *
 * (한국은 OGQ 마켓 API로 자동 수집되니 여기 없음 — frontend/src/pages/StickerTrends.tsx 참고)
 *
 * 처음엔 GIPHY Trending API로 자동 수집을 시도했지만, 실제로 호출해보니 country_code를
 * 바꿔도 결과가 거의/완전히 동일하게 나와(Beta 키 기준 실측 확인) 국가별 차이가 의미 없었다.
 * LINE·WeChat은 공식 공개 API 자체가 없어서, 지금은 팀이 각 스토어를 직접 보고 고른 걸
 * 여기에 채워 넣는 방식으로 간다.
 *
 * 채우는 법: 아래 배열에 { title, thumbnailUrl } 객체를 추가하면 된다.
 * - thumbnailUrl은 정사각형에 가까운 이미지 URL이면 아무거나 된다(외부 호스팅 URL도 가능).
 * - id는 그냥 고유한 문자열이면 됨(React key 용도).
 */
export interface CuratedSticker {
  id: string
  title: string
  thumbnailUrl: string
}

export const STICKER_TRENDS: Record<'JP' | 'CN' | 'US', CuratedSticker[]> = {
  JP: [],
  CN: [],
  US: [],
}
