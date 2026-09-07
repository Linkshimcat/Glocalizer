import type { LocalizationPromptInput, TargetLanguage } from '../../types/localization.js';

export interface LocalizationBatchInput extends Omit<LocalizationPromptInput, 'targetLanguage' | 'constraints'> {
  targetLanguages: TargetLanguage[];
  constraintsByLanguage: Partial<Record<TargetLanguage, LocalizationPromptInput['constraints']>>;
}
