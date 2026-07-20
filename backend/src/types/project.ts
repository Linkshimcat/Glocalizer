export type ProjectStatus = 'created' | 'processing' | 'completed' | 'failed' | 'expired';

export type TargetLanguage = 'en' | 'ja' | 'zh';

export interface LocalizationOptions {
  tone: 'cute' | 'funny' | 'energetic' | 'serious' | 'sarcastic';
  audience: 'general' | 'teen' | 'business';
  translationStyle: 'natural' | 'trendy' | 'literal';
  highQualityReview: boolean;
}

export interface ProjectRow {
  id: string;
  access_token_hash: string;
  status: ProjectStatus;
  stage: string | null;
  progress: number;
  target_languages: TargetLanguage[];
  localization_options: LocalizationOptions;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}
