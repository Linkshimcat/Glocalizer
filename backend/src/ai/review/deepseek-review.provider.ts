import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import { deepseekReviewResponseSchema } from '../../schemas/review.schema.js';
import type { TranslationReviewInput, TranslationReviewResult } from '../../types/review.js';
import { callChatCompletion } from '../nvidia/nvidia-llm.client.js';
import { buildDeepseekReviewPrompt } from '../prompts/deepseek-review.prompt.js';
import type { TranslationReviewProvider } from './review-provider.types.js';

function parseJsonContent(content: string): unknown {
  const stripped = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  try {
    return JSON.parse(stripped);
  } catch {
    throw new AppError('DEEPSEEK_REVIEW_FAILED', { rawContent: content.slice(0, 500) }, 'DeepSeek 응답이 유효한 JSON이 아닙니다.');
  }
}

export const deepseekReviewProvider: TranslationReviewProvider = {
  async review(input: TranslationReviewInput): Promise<TranslationReviewResult> {
    const apiKey = env.NVIDIA_REVIEW_API_KEY ?? env.NVIDIA_API_KEY;
    if (!apiKey) {
      throw new AppError('DEEPSEEK_REVIEW_FAILED', undefined, 'NVIDIA_REVIEW_API_KEY가 설정되어 있지 않습니다.');
    }

    const content = await callChatCompletion({
      apiKey,
      model: env.NVIDIA_REVIEW_MODEL,
      messages: [{ role: 'user', content: buildDeepseekReviewPrompt(input) }],
      temperature: 0.3,
      topP: 0.95,
      maxTokens: 2048,
      jsonMode: true,
      extraBody: { chat_template_kwargs: { thinking: false } },
      errorCode: 'DEEPSEEK_REVIEW_FAILED',
    });

    const parsed = deepseekReviewResponseSchema.safeParse(parseJsonContent(content));
    if (!parsed.success) {
      throw new AppError(
        'DEEPSEEK_REVIEW_FAILED',
        { issues: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) },
        'DeepSeek 응답이 예상한 스키마와 다릅니다.',
      );
    }

    return parsed.data;
  },
};
