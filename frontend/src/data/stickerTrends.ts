/**
 * 일본/중국/미국 인기 이모티콘 — 팀원이 직접 조사해서 채워 넣는 수동 큐레이션 데이터.
 *
 * (한국은 OGQ 마켓 API로 자동 수집되니 여기 없음 — frontend/src/pages/StickerTrends.tsx 참고)
 *
 * 저작권 주의: 이전에 LINE/WeChat/GIPHY 스토어의 실제 스티커 이미지를 그대로 저장소에 커밋해
 * 공개 화면에 띄웠다가(2026-10-17~20), 다른 회사 소유 캐릭터 이미지를 라이선스 없이 배포한
 * 꼴이라 삭제했다(2026-10-20). 다시 채울 때는 반드시 다음 중 하나만 쓴다:
 *  - 직접 그린/제작한 대체 이미지
 *  - 라이선스가 명확한 스톡/오픈소스 이미지(출처·라이선스 기록 필수)
 *  - 각 플랫폼이 공식적으로 제공하는 뱃지/워드마크 등 재배포가 허용된 자료
 * 특정 스토어의 실제 스티커 캐릭터 이미지를 스크린샷·다운로드해서 그대로 커밋하지 않는다.
 *
 * 채우는 법: frontend/src/assets/stickers/<국가코드 소문자>/ 에 이미지 파일을 넣고,
 * 아래 import 목록 + 배열에 { id, thumbnailUrl } 한 줄씩 추가하면 된다. 이름(title)은
 * 안 받음 — 이미지만 있으면 됨.
 */
export interface CuratedSticker {
  id: string
  thumbnailUrl: string
}

export const STICKER_TRENDS: Record<'JP' | 'CN' | 'US', CuratedSticker[]> = {
  JP: [],
  CN: [],
  US: [],
}
