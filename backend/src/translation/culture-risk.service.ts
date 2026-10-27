import { taskFetch } from '../utils/task-context.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { AppError } from '../errors/app-error.js';
import { cultureRiskModelResponseSchema, type CultureRiskFinding } from '../schemas/culture-risk.schema.js';
import type { TargetLanguage } from '../types/localization.js';

const LOCALE_NAMES: Record<TargetLanguage, string> = {
  en: 'English-speaking',
  ja: 'Japanese',
  zh: 'Simplified-Chinese-reading Mainland Chinese',
};

/**
 * Culture & Policy Risk Guard(FEAT-08). 번역 후보가 대상 언어권에서 정치·종교·차별 관련으로
 * 오해를 살 수 있는지 판단한다. 법적 권한이 없는 모델이 "금지·불법·차별"이라고 단정하면
 * 과신을 주므로, 프롬프트에서 항상 "확인 필요" 수준으로만 말하게 강제한다(never assert 문구).
 * 호출 빈도·파이프라인 연결 지점은 이 파일 바깥(translation/ 폴더의 다른 파일, 윤재 소유)의
 * 책임이다 — 이 함수는 입력 하나에 대한 순수 판단만 한다.
 */
function buildPrompt(sourceText: string, candidates: string[], languageCode: TargetLanguage): string {
  return [
    `You are a cautious cultural-sensitivity reviewer for sticker/emoticon captions being localized from Korean into ${LOCALE_NAMES[languageCode]} markets for public chat platforms.`,
    'For each candidate translation below, decide whether a human reviewer should double-check it for political, religious, or discrimination-adjacent sensitivity in the target locale\'s mainstream culture — i.e. something that could be read very differently than intended once published publicly, even if the Korean source was completely innocent.',
    'You do not have legal or cultural authority. Never assert that a phrase IS banned, illegal, hateful, or discriminatory. Only ever flag it as something a human should review, and always phrase the reason as a caution a reviewer should check, not a verdict.',
    'If a candidate has no plausible sensitivity, do not include it in the output at all — do not flag things just to have something to say.',
    'For every candidate you DO flag, always provide exactly 3 alternative phrasings that preserve the original Korean meaning and emotional tone but avoid the specific concern you raised.',
    `Source Korean caption: ${JSON.stringify(sourceText)}`,
    `Candidate translations: ${JSON.stringify(candidates)}`,
    'Return JSON only: {"findings":[{"candidateText":"<must exactly match one of the candidates above>","reason":"<a caution to check, not a verdict>","alternatives":["...","...","..."]}]}',
  ].join('\n');
}

export async function assessCultureRisk(
  sourceText: string,
  candidates: string[],
  languageCode: TargetLanguage,
): Promise<CultureRiskFinding[]> {
  if (!env.OPENAI_API_KEY) throw new AppError('CULTURE_RISK_UNAVAILABLE');
  if (candidates.length === 0) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.CULTURE_RISK_TIMEOUT_MS);
  try {
    const response = await taskFetch(`${env.OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: env.CULTURE_RISK_MODEL,
        messages: [{ role: 'user', content: buildPrompt(sourceText, candidates, languageCode) }],
        max_completion_tokens: 1_200,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new AppError('CULTURE_RISK_FAILED', { status: response.status }, `문화권 민감성 검토 요청이 실패했습니다. (${response.status})`);
    const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new AppError('CULTURE_RISK_FAILED', undefined, '문화권 민감성 검토 결과가 비어 있습니다.');
    const parsed = cultureRiskModelResponseSchema.parse(JSON.parse(content));
    // 모델이 후보 목록에 없는 텍스트를 candidateText로 돌려줄 수 있어, 실제 후보와 일치하는
    // 것만 신뢰한다 — 안 그러면 에디터가 존재하지 않는 문구를 "위험"이라고 가리킬 수 있다.
    return parsed.findings
      .filter(finding => candidates.includes(finding.candidateText))
      .map(finding => ({
        sourceText,
        candidateText: finding.candidateText,
        languageCode,
        reason: finding.reason,
        alternatives: finding.alternatives as [string, string, string],
        source: 'ai_suggestion' as const,
        severity: 'review' as const,
      }));
  } catch (error) {
    if (error instanceof AppError) throw error;
    const timedOut = error instanceof Error && error.name === 'AbortError';
    if (!timedOut) logger.warn({ err: error }, 'Culture risk response could not be parsed');
    throw new AppError('CULTURE_RISK_FAILED', undefined, timedOut ? '문화권 민감성 검토 요청 시간이 초과되었습니다.' : '문화권 민감성 검토를 생성하지 못했습니다.');
  } finally {
    clearTimeout(timeout);
  }
}
