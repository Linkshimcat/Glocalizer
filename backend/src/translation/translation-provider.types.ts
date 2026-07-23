import type { LocalizationBatchInput } from '../ai/localization/localization-provider.types.js';
import type { TargetLanguage, TranslationResult } from '../types/localization.js';

export interface TranslationProvider {
  readonly name: string;
  readonly model: string;
  localizeBatch(input: LocalizationBatchInput): Promise<Map<TargetLanguage, TranslationResult>>;
}
