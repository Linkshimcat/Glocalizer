import { LOCALIZATION_PROMPT_VERSION } from '../ai/prompts/prompt-version.js';
import type { LocalizationBatchInput } from '../ai/localization/localization-provider.types.js';
import { buildTranslationMessages, type PromptMessage } from './translation-prompt.js';

export interface TranslationRequestConfig {
  provider: 'openai' | 'groq';
  model: string;
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
  attempts: number;
  maxTokens: number;
  reasoningEffort?: string;
  temperature?: number;
  promptVersion: string;
}

/** Pure configuration: evaluations do not require application DB/auth settings. */
export function translationRequestConfig(
  provider: 'openai' | 'groq',
  values: Record<string, unknown> = process.env,
): TranslationRequestConfig {
  const number = (key: string, fallback: number) => Number(values[key] ?? fallback);
  const string = (key: string, fallback: string) => String(values[key] ?? fallback);
  const shared = {
    provider,
    attempts: number('AI_MAX_RETRIES', 3),
    promptVersion: LOCALIZATION_PROMPT_VERSION,
  };
  return provider === 'openai'
    ? {
        ...shared,
        model: string('OPENAI_TRANSLATION_MODEL', 'gpt-5.6'),
        baseUrl: string('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        apiKey: values.OPENAI_API_KEY as string | undefined,
        timeoutMs: number('OPENAI_TRANSLATION_TIMEOUT_MS', 60_000),
        maxTokens: 3000,
        reasoningEffort: string('OPENAI_TRANSLATION_REASONING_EFFORT', 'low'),
      }
    : {
        ...shared,
        model: string('GROQ_MODEL', 'qwen/qwen3.8-27b'),
        baseUrl: string('GROQ_BASE_URL', 'https://api.groq.com/openai/v1'),
        apiKey: values.GROQ_API_KEY as string | undefined,
        timeoutMs: number('TRANSLATION_TIMEOUT_MS', 15_000),
        maxTokens: 1500,
        reasoningEffort: 'none',
        temperature: 0.4,
      };
}

export function buildChatRequest(
  config: TranslationRequestConfig,
  messages: Array<{ role: string; content: string }>,
): Record<string, unknown> {
  return {
    model: config.model,
    messages,
    response_format: { type: 'json_object' },
    ...(config.provider === 'groq'
      ? { max_tokens: config.maxTokens }
      : { max_completion_tokens: config.maxTokens }),
    ...(config.reasoningEffort !== undefined ? { reasoning_effort: config.reasoningEffort } : {}),
    ...(config.temperature !== undefined ? { temperature: config.temperature } : {}),
  };
}

export type GroqPromptProfile = 'current' | 'groq-v3-meaning' | 'groq-v3-register';
export function groqMessages(
  input: LocalizationBatchInput,
  profile: GroqPromptProfile = 'current',
): PromptMessage[] {
  const messages = buildTranslationMessages(input);
  if (profile === 'current') return messages;
  const additions = [
    'Before choosing BEST, silently reconstruct the whole Korean utterance. A line break is a layout boundary, not an invitation to omit either clause. Preserve negation, who acts, tense, questions and contrasts. Compress wording rather than dropping meaning.',
    'Everyday metaphors describe an intent: infer it from the complete utterance and context. Do not translate a metaphor literally when that changes what the speaker is doing. Do not invent a subject, location, promise or emotion.',
    ...(profile === 'groq-v3-register'
      ? [
          'Check politeness and speech act before returning: a request stays a request, gratitude stays gratitude, an apology stays an apology. Preserve courteous wording even under a tight character budget. Recheck BEST against every clause of the source.',
        ]
      : []),
  ];
  return messages.map((message) =>
    message.role === 'system'
      ? { ...message, content: `${message.content}\n${additions.join('\n')}` }
      : message,
  );
}
