import type { LocalizationBatchInput } from '../../src/ai/localization/localization-provider.types.js';
import { executeChat, executeTranslation } from '../../src/translation/translation-http.js';
import { createTranslationContext } from '../../src/translation/translation-execution.js';
import { translationRequestConfig } from '../../src/translation/translation-request.js';
import type { EvaluationBudget } from './budget.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
export interface ChatOptions {
  provider: 'groq' | 'openai';
  model: string;
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: string;
}
export interface ChatResult {
  content: string;
  ms: number;
  promptTokens: number;
  completionTokens: number;
}
let budget: EvaluationBudget | undefined;
export function setEvaluationBudget(value: EvaluationBudget) {
  budget = value;
}
export function configFor(options: ChatOptions) {
  return {
    ...translationRequestConfig(options.provider),
    model: options.model,
    maxTokens: options.maxTokens ?? (options.provider === 'groq' ? 1500 : 4000),
    temperature: options.temperature,
    reasoningEffort: options.reasoningEffort,
  };
}
function contextFor(options: ChatOptions, judge = false) {
  if (!budget)
    throw new Error('A persistent evaluation budget must be configured before API calls');
  const context = createTranslationContext(
    undefined,
    judge
      ? { primaryMs: 120_000, totalMs: 120_000 }
      : {
          primaryMs: Number(process.env.TRANSLATION_PRIMARY_BUDGET_MS ?? 30_000),
          totalMs: Number(process.env.TRANSLATION_OPERATION_BUDGET_MS ?? 90_000),
        },
  );
  return {
    ...context,
    beforeRequest: (body: Record<string, unknown>) => budget!.reserve(options.provider, body),
  };
}
export async function chat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResult> {
  return executeChat(
    { ...configFor(options), timeoutMs: 120_000 },
    messages,
    contextFor(options, true),
  );
}
export async function generateTranslation(
  input: LocalizationBatchInput,
  messages: ChatMessage[],
  options: ChatOptions,
) {
  const started = Date.now();
  const metrics = {
    completionTokens: 0,
    promptTokens: 0,
    attempts: 0,
    queueWaitMs: 0,
    cooldownWaitMs: 0,
  };
  const context = {
    ...contextFor(options),
    onAttempt: (row: Record<string, unknown>) => {
      if (row.outcome === 'attempt_started') metrics.attempts++;
      if (row.outcome === 'attempt_success') {
        metrics.completionTokens += Number(row.completionTokens ?? 0);
        metrics.promptTokens += Number(row.promptTokens ?? 0);
      }
      metrics.queueWaitMs += Number(row.queueWaitMs ?? 0);
      metrics.cooldownWaitMs += Number(row.cooldownWaitMs ?? 0);
    },
  };
  const parsed = await executeTranslation(configFor(options), input, context, messages);
  return { parsed, ms: Date.now() - started, ...metrics };
}
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1)
    throw new Error('Concurrency must be a positive integer');
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await worker(items[index], index);
      }
    }),
  );
  return results;
}
