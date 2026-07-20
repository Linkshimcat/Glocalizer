import type { LocalizationPromptInput } from '../../types/localization.js';

const TARGET_LANGUAGE_LABEL: Record<LocalizationPromptInput['targetLanguage'], string> = {
  en: '영어',
  ja: '일본어',
  zh: '중국어(간체)',
};

const TONE_LABEL: Record<LocalizationPromptInput['context']['tone'], string> = {
  cute: '귀엽고 사랑스러운',
  funny: '유머러스하고 재미있는',
  energetic: '활기차고 에너제틱한',
  serious: '진지하고 담백한',
  sarcastic: '시니컬하고 위트있는',
};

const AUDIENCE_LABEL: Record<LocalizationPromptInput['context']['audience'], string> = {
  general: '일반 대중',
  teen: '10대 / Z세대',
  business: '비즈니스, 격식 있는',
};

const STYLE_LABEL: Record<LocalizationPromptInput['context']['translationStyle'], string> = {
  natural: '자연스러운 일상 표현',
  trendy: '최신 유행어와 밈을 활용한 트렌디한 표현',
  literal: '원문 의미에 최대한 가까운 표현',
};

export function buildGlmLocalizationPrompt(input: LocalizationPromptInput): string {
  const { sourceText, targetLanguage, context, constraints } = input;

  return `너는 한국어 이모티콘 문구를 해외 시장에 맞게 "초월번역"하는 현지화 전문가다.
단순 직역이 아니라, 타겟 언어권에서 실제로 쓰이는 자연스러운 표현으로 바꿔야 한다.

# 원문
- 한국어: "${sourceText}"
- 콘텐츠 종류: 이모티콘 문구 (짧고 임팩트 있어야 함)

# 타겟
- 언어: ${TARGET_LANGUAGE_LABEL[targetLanguage]} (${targetLanguage})
- 톤: ${TONE_LABEL[context.tone]}
- 타겟 독자: ${AUDIENCE_LABEL[context.audience]}
- 번역 스타일: ${STYLE_LABEL[context.translationStyle]}

# 제약
- 번역 결과는 공백 포함 최대 ${constraints.maxCharacters}자
- 텍스트가 들어갈 영역 크기: 가로 ${Math.round(constraints.textBoxWidth)}px × 세로 ${Math.round(constraints.textBoxHeight)}px (너무 길면 안 들어감)

# 출력 조건
- candidates는 정확히 3개
- 3개는 서로 의미나 표현 방식이 뚜렷하게 달라야 한다 (같은 말을 살짝만 바꾸지 말 것)
- best는 정확히 하나만 true (가장 추천하는 후보)
- 원문의 감정과 의도를 유지할 것
- ${TARGET_LANGUAGE_LABEL[targetLanguage]} 원어민이 봤을 때 실제로 자연스러운 표현이어야 함 (기계번역 티 금지)
- 과도한 욕설, 공격적이거나 차별적인 표현은 금지
- meaning 필드는 한국어로, 그 후보가 어떤 뉘앙스인지 간단히 설명

# 출력 형식
아래 JSON 스키마와 정확히 같은 구조로, 다른 설명이나 코드블록 없이 순수 JSON만 출력해라.

{
  "candidates": [
    { "text": "string", "tone": "string(영어로 짧게, 예: trendy/cute/casual)", "meaning": "string(한국어)", "best": boolean }
  ],
  "recommendedStyle": {
    "fontCategory": "bold" | "comic" | "cute" | "handwriting" | "minimal",
    "alignment": "left" | "center" | "right",
    "strokeRecommended": boolean,
    "shadowRecommended": boolean
  }
}`;
}
