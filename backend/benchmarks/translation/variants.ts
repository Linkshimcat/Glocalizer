import type { LocalizationBatchInput } from '../../src/ai/localization/localization-provider.types.js';
import { buildPrompt as baselinePrompt } from '../../src/translation/groq-translation.provider.js';
import { buildTranslationMessages } from '../../src/translation/translation-prompt.js';
import { buildTranslationMessagesV2 } from './prompt-v2.js';
import type { ChatMessage, ChatOptions } from './llm.js';

export interface Variant {
  name: string;
  description: string;
  options: ChatOptions;
  messages(input: LocalizationBatchInput): ChatMessage[];
}

/** 현재 프로덕션 그대로(Groq qwen3.8-27b, 단일 user 프롬프트, temperature 0.75). */
export const baseline: Variant = {
  name: 'baseline',
  description: 'production: groq qwen3.8-27b, current prompt, t=0.75',
  options: { provider: 'groq', model: 'qwen/qwen3.8-27b', temperature: 0.75, maxTokens: 1500, reasoningEffort: 'none' },
  messages: (input) => [{ role: 'user', content: baselinePrompt(input) }],
};

const groqQwen = { provider: 'groq' as const, model: 'qwen/qwen3.8-27b', maxTokens: 1500, reasoningEffort: 'none' };

/** v1: 새 시스템 프롬프트(충실도 우선·BEST 재정의·few-shot), 같은 모델, 낮춘 temperature. */
export const v1: Variant = {
  name: 'v1',
  description: 'groq qwen3.8-27b, new prompt (fidelity-first), t=0.4',
  options: { ...groqQwen, temperature: 0.4 },
  messages: (input) => buildTranslationMessages(input),
};

const openai = (model: string, name: string): Variant => ({
  name,
  description: `openai ${model}, new prompt`,
  options: { provider: 'openai', model, maxTokens: 3000, reasoningEffort: 'low' },
  messages: (input) => buildTranslationMessages(input),
});

const openaiV2 = (model: string, name: string): Variant => ({
  name,
  description: `openai ${model}, prompt v2 (intent step)`,
  options: { provider: 'openai', model, maxTokens: 3500, reasoningEffort: 'low' },
  messages: (input) => buildTranslationMessagesV2(input),
});

const effort = (model: string, name: string, reasoningEffort: string): Variant => ({
  name,
  description: `openai ${model}, prompt v1, reasoning_effort=${reasoningEffort}`,
  options: { provider: 'openai', model, maxTokens: 3000, reasoningEffort },
  messages: (input) => buildTranslationMessages(input),
});

export const VARIANTS: Record<string, Variant> = {
  'v1-gpt56-none': effort('gpt-5.6', 'v1-gpt56-none', 'none'),
  'v1-gpt56-med': effort('gpt-5.6', 'v1-gpt56-med', 'medium'),
  'v1-luna-none': effort('gpt-5.6-luna', 'v1-luna-none', 'none'),
  'v2-luna': openaiV2('gpt-5.6-luna', 'v2-luna'),
  'v2-gpt56': openaiV2('gpt-5.6', 'v2-gpt56'),
  'v2-gpt55': openaiV2('gpt-5.5', 'v2-gpt55'),
  baseline,
  v1,
  'v1-oss120': { name: 'v1-oss120', description: 'groq gpt-oss-120b, new prompt', options: { provider: 'groq', model: 'openai/gpt-oss-120b', temperature: 0.4, maxTokens: 3000, reasoningEffort: 'low' }, messages: (input) => buildTranslationMessages(input) },
  'v1-gpt55': openai('gpt-5.5', 'v1-gpt55'),
  'v1-gpt56': openai('gpt-5.6', 'v1-gpt56'),
  'v1-luna': openai('gpt-5.6-luna', 'v1-luna'),
  'v1-gpt41': { name: 'v1-gpt41', description: 'openai gpt-4.1, new prompt, t=0.4', options: { provider: 'openai', model: 'gpt-4.1', temperature: 0.4, maxTokens: 1500 }, messages: (input) => buildTranslationMessages(input) },
};
