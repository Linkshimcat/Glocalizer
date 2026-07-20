import type { LocalizationPromptInput, TranslationResult } from '../../types/localization.js';

export interface LocalizationProvider {
  localize(input: LocalizationPromptInput): Promise<TranslationResult>;
}
