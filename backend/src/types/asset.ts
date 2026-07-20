export type AssetStatus =
  | 'pending_upload'
  | 'uploaded'
  | 'validating'
  | 'preprocessing'
  | 'ocr'
  | 'translating'
  | 'reviewing'
  | 'cleaning'
  | 'saving'
  | 'completed'
  | 'failed';

export interface AssetRow {
  id: string;
  project_id: string;
  client_id: string | null;
  original_name: string;
  mime_type: string;
  byte_size: number;
  width: number | null;
  height: number | null;
  has_alpha: boolean | null;
  original_path: string | null;
  preprocessed_path: string | null;
  cleaned_path: string | null;
  status: AssetStatus;
  stage: string | null;
  progress: number;
  cleanup_method: string | null;
  cleanup_quality: string | null;
  needs_manual_cleanup: boolean;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
