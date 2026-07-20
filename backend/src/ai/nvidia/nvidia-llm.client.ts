import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import { withRetry } from '../../utils/retry.js';
import type { ErrorCode } from '../../errors/error-codes.js';

/**
 * https://integrate.api.nvidia.com/v1/chat/completions 는 OpenAI Chat Completions 호환
 * 엔드포인트다. response_format: { type: "json_object" }로 구조화 JSON 출력을 요청할 수 있고,
 * GLM 5.2에서 실제로 잘 동작하는 것까지 확인했다(2026-07-21 실측).
 */
export interface ChatCompletionRequest {
  apiKey: string;
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  /** 예: DeepSeek V4 Pro의 { chat_template_kwargs: { thinking: false } } 처럼 모델별 추가 파라미터. */
  extraBody?: Record<string, unknown>;
  errorCode: ErrorCode;
}

export async function callChatCompletion(request: ChatCompletionRequest): Promise<string> {
  const endpoint = `${env.NVIDIA_LLM_BASE_URL.replace(/\/+$/, '')}/chat/completions`;

  return withRetry(
    async () => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${request.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
          top_p: request.topP ?? 1,
          max_tokens: request.maxTokens ?? 1024,
          stream: false,
          ...(request.jsonMode ? { response_format: { type: 'json_object' } } : {}),
          ...request.extraBody,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new AppError(
          request.errorCode,
          { status: response.status, body: body.slice(0, 500) },
          `NVIDIA LLM 요청이 실패했습니다 (status ${response.status}).`,
        );
      }

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = json.choices?.[0]?.message?.content;

      if (!content) {
        throw new AppError(request.errorCode, undefined, 'NVIDIA LLM 응답에 content가 없습니다.');
      }

      return content;
    },
    {
      attempts: 3,
      delayMs: 500,
      shouldRetry: (err) => !(err instanceof AppError) || (typeof err.details?.status === 'number' && err.details.status >= 500),
    },
  );
}
