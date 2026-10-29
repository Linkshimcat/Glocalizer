import type { EditorStateRow } from '../repositories/editor-state.repository.js';
import type { AssetRow } from '../types/asset.js';
import type { OcrRegionRow } from '../types/ocr.js';
import type { TranslationRow } from '../types/translation.js';

// QA 규칙이 실제로 읽는 컬럼만 좁혀 둔다. 규칙을 순수 함수로 유지해 DB 없이 테스트할 수 있게 하려는 것이다.
export type QaAssetRow = Pick<AssetRow, 'id' | 'status' | 'error_code' | 'error_message' | 'needs_manual_cleanup' | 'cleaned_path' | 'updated_at'>;
export type QaOcrRegionRow = Pick<OcrRegionRow, 'id' | 'detected_text' | 'confidence' | 'bbox' | 'contains_korean' | 'needs_manual_review' | 'is_primary'>;
export type QaTranslationRow = Pick<TranslationRow, 'ocr_region_id' | 'language_code' | 'final_candidates'>;
export type QaEditorStateRow = Pick<EditorStateRow, 'ocr_region_id' | 'language_code' | 'style'>;

export interface QaAssetInput {
  asset: QaAssetRow;
  regions: QaOcrRegionRow[];
  translations: QaTranslationRow[];
  editorStates: QaEditorStateRow[];
  /** 브라우저가 내보내 보낸 최종 PNG. 받지 않았으면 null — 규격은 측정하지 않는다. */
  image: Buffer | null;
}
