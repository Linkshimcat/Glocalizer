import type { TranslationReviewInput } from '../../types/review.js';

export function buildDeepseekReviewPrompt(input: TranslationReviewInput): string {
  const { sourceText, targetLanguage, candidates, requirements } = input;

  const candidateList = candidates
    .map((candidate, index) => `${index}. "${candidate.text}" (tone: ${candidate.tone}, meaning: ${candidate.meaning})`)
    .join('\n');

  return `너는 번역 품질을 검수하는 냉정한 전문가다. 아래 원문과 번역 후보들을 평가해라.

# 원문
- 한국어: "${sourceText}"
- 콘텐츠 종류: ${requirements.contentType} (이모티콘 문구, 짧고 임팩트 있어야 함)

# 타겟
- 언어: ${targetLanguage}
- 최대 길이: ${requirements.maxCharacters}자
- 원하는 톤: ${requirements.desiredTone}

# 번역 후보
${candidateList}

# 평가 기준
각 후보를 0~100점으로 채점해라.
- naturalness: 타겟 언어 원어민이 봤을 때 자연스러운 정도
- meaningPreservation: 원문의 의미/의도를 얼마나 유지하는지
- culturalFit: 타겟 문화권에서 실제로 통하는 표현인지
- lengthFit: 길이 제한과 이모티콘 텍스트로서의 적합성
- safety: 욕설/공격적/차별적 표현이 없는지 (문제 있으면 낮은 점수)

전체적으로 문제가 있으면(예: 의미가 완전히 다르거나, 부적절한 표현이 있으면) approved를 false로 하고
warnings에 이유를 적어라. 더 나은 표현이 있다면 replacements에 대안을 제시해라 (없으면 빈 배열).

# 출력 형식
아래 JSON 스키마와 정확히 같은 구조로, 다른 설명 없이 순수 JSON만 출력해라.

{
  "approved": boolean,
  "bestCandidateIndex": number,
  "scores": [
    { "index": number, "naturalness": number, "meaningPreservation": number, "culturalFit": number, "lengthFit": number, "safety": number }
  ],
  "warnings": ["string"],
  "replacements": [{ "index": number, "text": "string", "reason": "string" }]
}`;
}
