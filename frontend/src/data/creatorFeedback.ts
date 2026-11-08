// 랜딩 "작가님 피드백" 카드의 뼈대. 문장은 언어별로 i18n/creatorVoices.ts에 있고, 여기서는 누가·언제·어떻게
// 보이는지만 정한다. 모두 실제 사용자 인터뷰(README 사용자 인터뷰 기록)에서 나온 의견이고, 이미 고친 것만 담는다.
//
// 이름은 가운데를 가린 표기를 쓴다. 프로필 이미지(avatarSrc)는 작가님이 쓰는 그림을 96px로 줄인 파일이며,
// 공개 전에 작가님의 사용 동의를 확인해야 한다. avatarSrc가 비어 있으면 글자 하나짜리 배지(initial)로 보인다.
// 4KB 미만 이미지는 Vite가 base64로 HTML에 박는데, 카드마다 반복되어 사전 렌더 HTML이 커지므로 ?no-inline으로 파일로 둔다.
import mureungdowon from '../assets/creators/mureungdowon.webp?no-inline'
import oktudio from '../assets/creators/oktudio.webp?no-inline'
import sondochi from '../assets/creators/sondochi.webp?no-inline'

export type CreatorFeedbackId =
  | 'jp-reading'
  | 'align-clip'
  | 'outline'
  | 'cjk-fonts'
  | 'culture-risk'
  | 'region-delete'
  | 'copy-text'

export interface CreatorFeedbackCard {
  id: CreatorFeedbackId
  /** 가운데를 가린 이름 (예: 손*치) */
  name: string
  /** 아바타 배지에 들어갈 한 글자 */
  initial: string
  /** 피드백을 받은 날 (YYYY.MM.DD) */
  feedbackDate: string
  /** 동의받은 프로필 이미지 경로. 없으면 initial 배지 */
  avatarSrc?: string
}

export const CREATOR_FEEDBACK: CreatorFeedbackCard[] = [
  { id: 'jp-reading', name: '옥*디오', initial: '옥', feedbackDate: '2026.09.17', avatarSrc: oktudio },
  { id: 'align-clip', name: '손*치', initial: '손', feedbackDate: '2026.10.28', avatarSrc: sondochi },
  { id: 'outline', name: '손*치', initial: '손', feedbackDate: '2026.10.28', avatarSrc: sondochi },
  { id: 'cjk-fonts', name: '손*치', initial: '손', feedbackDate: '2026.10.28', avatarSrc: sondochi },
  { id: 'culture-risk', name: '무*도원', initial: '무', feedbackDate: '2026.10.27', avatarSrc: mureungdowon },
  { id: 'region-delete', name: '무*도원', initial: '무', feedbackDate: '2026.10.27', avatarSrc: mureungdowon },
  { id: 'copy-text', name: '무*도원', initial: '무', feedbackDate: '2026.10.27', avatarSrc: mureungdowon },
]
