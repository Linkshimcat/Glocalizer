import type { SiteLang } from './translations'

const copy = {
  personaTitle: ['캐릭터 말투', 'Character voice', 'キャラクターの口調', '角色语气'],
  personaOptional: ['선택', 'Optional', '任意', '可选'],
  personaDesc: ['적어두면 세트 전체 번역이 같은 캐릭터 말투로 맞춰져요. 비워두면 지금처럼 번역해요. 원문의 뜻과 감정은 바뀌지 않아요.', 'Fill this in to keep every caption in the set in the same character voice. Leave it blank to translate as usual. The meaning and emotion of the original stay the same.', '入力するとセット全体の翻訳が同じキャラクターの口調にそろいます。空欄なら通常どおり翻訳します。原文の意味と感情は変わりません。', '填写后整套翻译会统一成同一个角色语气。留空则照常翻译。原文的意思和情感不会改变。'],
  personaPersonality: ['성격', 'Personality', '性格', '性格'],
  personaPersonalityPlaceholder: ['예: 수줍음 많은 고양이', 'e.g. a shy cat', '例：恥ずかしがりな猫', '例：害羞的小猫'],
  personaSpeechStyle: ['말투', 'Speech style', '話し方', '说话方式'],
  personaSpeechStylePlaceholder: ['예: 말끝을 흐리는 반말', 'e.g. casual, trailing off at the end', '例：語尾をにごすタメ口', '例：句尾含糊的随意口吻'],
  personaAge: ['나이', 'Age', '年齢', '年龄'],
  personaAgePlaceholder: ['예: 10대', 'e.g. teens', '例：10代', '例：十几岁'],
  personaAvoid: ['쓰지 않을 표현', 'Expressions to avoid', '使わない表現', '不使用的表达'],
  personaAvoidPlaceholder: ['쉼표로 구분 (최대 10개)', 'Separate with commas (up to 10)', 'カンマ区切り（最大10個）', '用逗号分隔（最多 10 个）'],
  personaSaveFailed: ['캐릭터 말투를 저장하지 못했어요. 다시 시도해주세요.', "Couldn't save the character voice. Please try again.", 'キャラクターの口調を保存できませんでした。もう一度お試しください。', '角色语气保存失败，请重试。'],
}

export function personaCopy(lang: SiteLang) {
  const index = ({ ko: 0, en: 1, ja: 2, zh: 3 })[lang]
  return Object.fromEntries(Object.entries(copy).map(([key, values]) => [key, values[index]])) as Record<keyof typeof copy, string>
}

export type PersonaCopy = ReturnType<typeof personaCopy>
