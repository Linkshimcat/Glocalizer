import { env } from '../../src/config/env.js';

export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }
export interface ChatOptions {
  provider: 'groq' | 'openai';
  model: string;
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: string;
}
export interface ChatResult { content: string; ms: number; promptTokens: number; completionTokens: number }

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 벤치마크용 얇은 채팅 호출. 429/5xx는 백오프로 재시도하고, 모델이 거부하는 선택 파라미터는 빼고 다시 보낸다. */
export async function chat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResult> {
  const base = options.provider === 'groq' ? env.GROQ_BASE_URL : env.OPENAI_BASE_URL;
  const key = options.provider === 'groq' ? env.GROQ_API_KEY : env.OPENAI_API_KEY;
  if (!key) throw new Error(`${options.provider} API key is not configured`);
  const optional: Record<string, unknown> = {};
  if (options.temperature !== undefined) optional.temperature = options.temperature;
  if (options.reasoningEffort) optional.reasoning_effort = options.reasoningEffort;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const started = Date.now();
    const body: Record<string, unknown> = {
      model: options.model,
      messages,
      response_format: { type: 'json_object' },
      ...(options.provider === 'groq' ? { max_tokens: options.maxTokens ?? 1500 } : { max_completion_tokens: options.maxTokens ?? 4000 }),
      ...optional,
    };
    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
    const text = await response.text();
    if (response.ok) {
      const parsed = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } };
      return { content: parsed.choices?.[0]?.message?.content ?? '', ms: Date.now() - started, promptTokens: parsed.usage?.prompt_tokens ?? 0, completionTokens: parsed.usage?.completion_tokens ?? 0 };
    }
    if (response.status === 400) {
      const unsupported = ['temperature', 'reasoning_effort'].find((name) => name in optional && text.includes(name));
      if (unsupported) { delete optional[unsupported]; continue; }
    }
    if (response.status === 429 || response.status >= 500) {
      const wait = Math.min(60_000, Math.max(2_000, Number(/try again in ([\d.]+)s/i.exec(text)?.[1] ?? 0) * 1000 + 1_000, 2_000 * 2 ** attempt));
      await sleep(wait);
      continue;
    }
    throw new Error(`${options.provider} ${response.status}: ${text.slice(0, 200)}`);
  }
  throw new Error(`${options.provider} request kept failing`);
}

export async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next; next += 1;
      results[index] = await worker(items[index], index);
    }
  }));
  return results;
}
