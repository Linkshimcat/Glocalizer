import type { LocalizationPromptInput, TargetLanguage, TranslationResult } from '../../types/localization.js';

export interface LocalizationBatchInput extends Omit<LocalizationPromptInput, 'targetLanguage' | 'constraints'> {
  targetLanguages: TargetLanguage[];
  constraintsByLanguage: Partial<Record<TargetLanguage, LocalizationPromptInput['constraints']>>;
}

export interface LocalizationProvider {
  localizeBatch(input: LocalizationBatchInput): Promise<Map<TargetLanguage, TranslationResult>>;
}
