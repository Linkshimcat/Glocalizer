import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import { glmTranslationResponseSchema } from '../../schemas/localization.schema.js';
import type { LocalizationPromptInput, TranslationResult } from '../../types/localization.js';
import { callChatCompletion } from '../nvidia/nvidia-llm.client.js';
import { buildGlmLocalizationPrompt } from '../prompts/glm-localization.prompt.js';
import type { LocalizationProvider } from './localization-provider.types.js';

function parseJsonContent(content: string): unknown {
  // GLM이 json_object 모드에서도 가끔 ```json 코드블록으로 감싸는 경우가 있어 방어적으로 벗겨낸다.
  const stripped = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  try {
    return JSON.parse(stripped);
  } catch {
    throw new AppError('GLM_TRANSLATION_FAILED', { rawContent: content.slice(0, 500) }, 'GLM 응답이 유효한 JSON이 아닙니다.');
  }
}

export const glmLocalizationProvider: LocalizationProvider = {
  async localize(input: LocalizationPromptInput): Promise<TranslationResult> {
    const apiKey = env.NVIDIA_TRANSLATION_API_KEY ?? env.NVIDIA_API_KEY;
    if (!apiKey) {
      throw new AppError('GLM_TRANSLATION_FAILED', undefined, 'NVIDIA_TRANSLATION_API_KEY가 설정되어 있지 않습니다.');
    }

    const content = await callChatCompletion({
      apiKey,
      model: env.NVIDIA_TRANSLATION_MODEL,
      messages: [{ role: 'user', content: buildGlmLocalizationPrompt(input) }],
      temperature: 0.7,
      topP: 1,
      maxTokens: 1024,
      jsonMode: true,
      errorCode: 'GLM_TRANSLATION_FAILED',
    });

    const parsed = glmTranslationResponseSchema.safeParse(parseJsonContent(content));
    if (!parsed.success) {
      throw new AppError(
        'GLM_TRANSLATION_FAILED',
        { issues: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) },
        'GLM 응답이 예상한 스키마와 다릅니다.',
      );
    }

    return {
      sourceText: input.sourceText,
      targetLanguage: input.targetLanguage,
      candidates: parsed.data.candidates,
      recommendedStyle: parsed.data.recommendedStyle,
    };
  },
};
