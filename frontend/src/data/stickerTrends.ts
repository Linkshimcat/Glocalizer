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
 * 채우는 법: frontend/src/assets/stickers/<국가코드 소문자>/ 에 이미지 파일을 넣고,
 * 아래 import 목록 + 배열에 { id, thumbnailUrl } 한 줄씩 추가하면 된다. 이름(title)은
 * 안 받음 — 이미지만 있으면 됨.
 */
export interface CuratedSticker {
  id: string
  thumbnailUrl: string
}

import cn01 from '../assets/stickers/cn/cn-01.png'
import cn02 from '../assets/stickers/cn/cn-02.png'
import cn03 from '../assets/stickers/cn/cn-03.png'
import cn04 from '../assets/stickers/cn/cn-04.png'
import cn05 from '../assets/stickers/cn/cn-05.png'
import cn06 from '../assets/stickers/cn/cn-06.png'
import cn07 from '../assets/stickers/cn/cn-07.png'
import cn08 from '../assets/stickers/cn/cn-08.png'
import cn09 from '../assets/stickers/cn/cn-09.png'
import cn10 from '../assets/stickers/cn/cn-10.png'
import cn11 from '../assets/stickers/cn/cn-11.png'
import cn12 from '../assets/stickers/cn/cn-12.png'
import cn13 from '../assets/stickers/cn/cn-13.png'
import cn14 from '../assets/stickers/cn/cn-14.png'
import cn15 from '../assets/stickers/cn/cn-15.png'
import cn16 from '../assets/stickers/cn/cn-16.png'
import cn17 from '../assets/stickers/cn/cn-17.png'
import cn18 from '../assets/stickers/cn/cn-18.png'
import cn19 from '../assets/stickers/cn/cn-19.png'
import cn20 from '../assets/stickers/cn/cn-20.png'
import cn21 from '../assets/stickers/cn/cn-21.png'
import cn22 from '../assets/stickers/cn/cn-22.png'
import cn23 from '../assets/stickers/cn/cn-23.png'
import cn24 from '../assets/stickers/cn/cn-24.png'

import jp01 from '../assets/stickers/jp/jp-01.png'
import jp02 from '../assets/stickers/jp/jp-02.png'
import jp03 from '../assets/stickers/jp/jp-03.png'
import jp04 from '../assets/stickers/jp/jp-04.png'
import jp05 from '../assets/stickers/jp/jp-05.png'
import jp06 from '../assets/stickers/jp/jp-06.png'
import jp07 from '../assets/stickers/jp/jp-07.png'
import jp08 from '../assets/stickers/jp/jp-08.png'
import jp09 from '../assets/stickers/jp/jp-09.png'
import jp10 from '../assets/stickers/jp/jp-10.png'
import jp11 from '../assets/stickers/jp/jp-11.png'
import jp12 from '../assets/stickers/jp/jp-12.png'
import jp13 from '../assets/stickers/jp/jp-13.png'
import jp14 from '../assets/stickers/jp/jp-14.png'
import jp15 from '../assets/stickers/jp/jp-15.png'
import jp16 from '../assets/stickers/jp/jp-16.png'
import jp17 from '../assets/stickers/jp/jp-17.png'
import jp18 from '../assets/stickers/jp/jp-18.png'
import jp19 from '../assets/stickers/jp/jp-19.png'
import jp20 from '../assets/stickers/jp/jp-20.png'
import jp21 from '../assets/stickers/jp/jp-21.png'
import jp22 from '../assets/stickers/jp/jp-22.png'
import jp23 from '../assets/stickers/jp/jp-23.png'
import jp24 from '../assets/stickers/jp/jp-24.png'

import us01 from '../assets/stickers/us/us-01.png'
import us02 from '../assets/stickers/us/us-02.png'
import us03 from '../assets/stickers/us/us-03.png'
import us04 from '../assets/stickers/us/us-04.png'
import us05 from '../assets/stickers/us/us-05.png'
import us06 from '../assets/stickers/us/us-06.png'
import us07 from '../assets/stickers/us/us-07.png'
import us08 from '../assets/stickers/us/us-08.png'
import us09 from '../assets/stickers/us/us-09.png'
import us10 from '../assets/stickers/us/us-10.png'
import us11 from '../assets/stickers/us/us-11.png'
import us12 from '../assets/stickers/us/us-12.png'
import us13 from '../assets/stickers/us/us-13.png'
import us14 from '../assets/stickers/us/us-14.png'
import us15 from '../assets/stickers/us/us-15.png'
import us16 from '../assets/stickers/us/us-16.png'
import us17 from '../assets/stickers/us/us-17.png'
import us18 from '../assets/stickers/us/us-18.png'
import us19 from '../assets/stickers/us/us-19.png'
import us20 from '../assets/stickers/us/us-20.png'
import us21 from '../assets/stickers/us/us-21.png'
import us22 from '../assets/stickers/us/us-22.png'
import us23 from '../assets/stickers/us/us-23.png'
import us24 from '../assets/stickers/us/us-24.png'

export const STICKER_TRENDS: Record<'JP' | 'CN' | 'US', CuratedSticker[]> = {
  JP: [
    { id: 'jp-01', thumbnailUrl: jp01 },
    { id: 'jp-02', thumbnailUrl: jp02 },
    { id: 'jp-03', thumbnailUrl: jp03 },
    { id: 'jp-04', thumbnailUrl: jp04 },
    { id: 'jp-05', thumbnailUrl: jp05 },
    { id: 'jp-06', thumbnailUrl: jp06 },
    { id: 'jp-07', thumbnailUrl: jp07 },
    { id: 'jp-08', thumbnailUrl: jp08 },
    { id: 'jp-09', thumbnailUrl: jp09 },
    { id: 'jp-10', thumbnailUrl: jp10 },
    { id: 'jp-11', thumbnailUrl: jp11 },
    { id: 'jp-12', thumbnailUrl: jp12 },
    { id: 'jp-13', thumbnailUrl: jp13 },
    { id: 'jp-14', thumbnailUrl: jp14 },
    { id: 'jp-15', thumbnailUrl: jp15 },
    { id: 'jp-16', thumbnailUrl: jp16 },
    { id: 'jp-17', thumbnailUrl: jp17 },
    { id: 'jp-18', thumbnailUrl: jp18 },
    { id: 'jp-19', thumbnailUrl: jp19 },
    { id: 'jp-20', thumbnailUrl: jp20 },
    { id: 'jp-21', thumbnailUrl: jp21 },
    { id: 'jp-22', thumbnailUrl: jp22 },
    { id: 'jp-23', thumbnailUrl: jp23 },
    { id: 'jp-24', thumbnailUrl: jp24 },
  ],
  CN: [
    { id: 'cn-01', thumbnailUrl: cn01 },
    { id: 'cn-02', thumbnailUrl: cn02 },
    { id: 'cn-03', thumbnailUrl: cn03 },
    { id: 'cn-04', thumbnailUrl: cn04 },
    { id: 'cn-05', thumbnailUrl: cn05 },
    { id: 'cn-06', thumbnailUrl: cn06 },
    { id: 'cn-07', thumbnailUrl: cn07 },
    { id: 'cn-08', thumbnailUrl: cn08 },
    { id: 'cn-09', thumbnailUrl: cn09 },
    { id: 'cn-10', thumbnailUrl: cn10 },
    { id: 'cn-11', thumbnailUrl: cn11 },
    { id: 'cn-12', thumbnailUrl: cn12 },
    { id: 'cn-13', thumbnailUrl: cn13 },
    { id: 'cn-14', thumbnailUrl: cn14 },
    { id: 'cn-15', thumbnailUrl: cn15 },
    { id: 'cn-16', thumbnailUrl: cn16 },
    { id: 'cn-17', thumbnailUrl: cn17 },
    { id: 'cn-18', thumbnailUrl: cn18 },
    { id: 'cn-19', thumbnailUrl: cn19 },
    { id: 'cn-20', thumbnailUrl: cn20 },
    { id: 'cn-21', thumbnailUrl: cn21 },
    { id: 'cn-22', thumbnailUrl: cn22 },
    { id: 'cn-23', thumbnailUrl: cn23 },
    { id: 'cn-24', thumbnailUrl: cn24 },
  ],
  US: [
    { id: 'us-01', thumbnailUrl: us01 },
    { id: 'us-02', thumbnailUrl: us02 },
    { id: 'us-03', thumbnailUrl: us03 },
    { id: 'us-04', thumbnailUrl: us04 },
    { id: 'us-05', thumbnailUrl: us05 },
    { id: 'us-06', thumbnailUrl: us06 },
    { id: 'us-07', thumbnailUrl: us07 },
    { id: 'us-08', thumbnailUrl: us08 },
    { id: 'us-09', thumbnailUrl: us09 },
    { id: 'us-10', thumbnailUrl: us10 },
    { id: 'us-11', thumbnailUrl: us11 },
    { id: 'us-12', thumbnailUrl: us12 },
    { id: 'us-13', thumbnailUrl: us13 },
    { id: 'us-14', thumbnailUrl: us14 },
    { id: 'us-15', thumbnailUrl: us15 },
    { id: 'us-16', thumbnailUrl: us16 },
    { id: 'us-17', thumbnailUrl: us17 },
    { id: 'us-18', thumbnailUrl: us18 },
    { id: 'us-19', thumbnailUrl: us19 },
    { id: 'us-20', thumbnailUrl: us20 },
    { id: 'us-21', thumbnailUrl: us21 },
    { id: 'us-22', thumbnailUrl: us22 },
    { id: 'us-23', thumbnailUrl: us23 },
    { id: 'us-24', thumbnailUrl: us24 },
  ],
}
