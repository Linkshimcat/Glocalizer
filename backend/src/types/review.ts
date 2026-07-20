export interface TranslationReviewInput {
  sourceText: string;
  targetLanguage: string;
  candidates: Array<{ text: string; tone: string; meaning: string }>;
  requirements: {
    maxCharacters: number;
    contentType: 'emoticon';
    desiredTone: string;
  };
}

export interface TranslationReviewScore {
  index: number;
  naturalness: number;
  meaningPreservation: number;
  culturalFit: number;
  lengthFit: number;
  safety: number;
}

export interface TranslationReviewReplacement {
  index: number;
  text: string;
  reason: string;
}

export interface TranslationReviewResult {
  approved: boolean;
  bestCandidateIndex: number;
  scores: TranslationReviewScore[];
  warnings: string[];
  replacements?: TranslationReviewReplacement[];
}
