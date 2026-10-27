import { z } from 'zod';

// 모델이 길이·개수 상한을 넘겨도 응답 전체를 버리지 않는다(deep-review.schema.ts와 동일 패턴) —
// 상한은 UI가 감당할 분량을 정하는 값이지 응답의 유효성을 가르는 값이 아니다.
const cappedText = (max: number) => z.string().min(1).transform(value => value.slice(0, max));
const cappedList = <T extends z.ZodTypeAny>(item: T, max: number) =>
  z.array(item).transform(value => value.slice(0, max));

/**
 * 번역 후보 하나에 대한 모델의 판단. "금지·불법·차별"처럼 단정하지 않고 항상 "확인 필요"로만
 * 안내하도록, reason 필드 자체가 질문/주의 형태를 띠도록 프롬프트에서 강제한다(culture-risk.service.ts).
 * alternatives는 플래그가 뜬 경우 항상 정확히 3개를 요구한다 — 사용자가 고를 선택지가 없으면
 * "확인 필요"라고만 던지고 끝나는 건 도움이 안 된다.
 */
const cultureRiskFindingSchema = z.object({
  candidateText: cappedText(200),
  reason: cappedText(400),
  alternatives: z.array(cappedText(200)).length(3),
});

export const cultureRiskModelResponseSchema = z.object({
  findings: cappedList(cultureRiskFindingSchema, 3),
});

export type CultureRiskModelResponse = z.infer<typeof cultureRiskModelResponseSchema>;

/** 서비스 함수의 공개 반환 타입 — 호출자(윤재의 파이프라인 연결 지점)가 원문·언어를 다시
 *  채워 넣을 필요 없이 바로 쓸 수 있게 모델 응답에 컨텍스트를 더한 모양이다. */
export interface CultureRiskFinding {
  sourceText: string;
  candidateText: string;
  languageCode: string;
  reason: string;
  alternatives: [string, string, string];
  source: 'ai_suggestion';
  /** 이 검사는 사람이 확인하라는 신호만 내고 절대 자동 차단하지 않는다 — 항상 'review'. */
  severity: 'review';
}
