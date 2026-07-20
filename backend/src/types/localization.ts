import type { LocalizationOptions, TargetLanguage } from './project.js';

export type { TargetLanguage } from './project.js';

export const MAX_CHARACTERS_BY_LANGUAGE: Record<TargetLanguage, number> = {
  en: 18,
  ja: 12,
  zh: 10,
};

export interface LocalizationPromptInput {
  sourceText: string;
  sourceLanguage: 'ko';
  targetLanguage: TargetLanguage;
  context: {
    contentType: 'emoticon';
    tone: LocalizationOptions['tone'];
    audience: LocalizationOptions['audience'];
    translationStyle: LocalizationOptions['translationStyle'];
  };
  constraints: {
    maxCharacters: number;
    textBoxWidth: number;
    textBoxHeight: number;
  };
}

export type FontCategory = 'bold' | 'comic' | 'cute' | 'handwriting' | 'minimal';

export interface TranslationCandidate {
  text: string;
  tone: string;
  meaning: string;
  best: boolean;
}

export interface RecommendedStyle {
  fontCategory: FontCategory;
  alignment: 'left' | 'center' | 'right';
  strokeRecommended: boolean;
  shadowRecommended: boolean;
}

export interface TranslationResult {
  sourceText: string;
  targetLanguage: TargetLanguage;
  candidates: TranslationCandidate[];
  recommendedStyle: RecommendedStyle;
}

export interface TranslationValidationResult {
  valid: boolean;
  needsReview: boolean;
  reasons: string[];
}
