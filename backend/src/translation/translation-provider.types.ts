import type { LocalizationBatchInput } from '../ai/localization/localization-provider.types.js';
import type { TargetLanguage, TranslationResult } from '../types/localization.js';

export interface TranslationExecutionContext {
  operationId: string;
  callId?: string;
  phase: 'batch' | 'language_recovery';
  /** Absolute deadlines, shared by the batch and all language recovery calls. */
  deadlineAt: number;
  primaryDeadlineAt: number;
  signal?: AbortSignal;
  onAttempt?: (fields: Record<string, unknown>) => void;
  /** Evaluation-only accounting hook: every HTTP attempt reserves its own cost. */
  beforeRequest?: (
    body: Record<string, unknown>,
  ) => (usage?: { prompt_tokens?: number; completion_tokens?: number }) => void;
}

export interface TranslationProvider {
  readonly name: string;
  readonly model: string;
  readonly promptVersion?: string;
  localizeBatch(
    input: LocalizationBatchInput,
    context?: TranslationExecutionContext,
  ): Promise<Map<TargetLanguage, TranslationResult>>;
}
