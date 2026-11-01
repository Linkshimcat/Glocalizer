import { pickFontByStyle, type FontStyleTag } from '../data/demo'
import type { ProjectResults } from './api'
import { styleKeyForRegion, type Style } from './style'
import type { StylesByLanguage, UploadFile } from '../store/uploads'

// 서버 결과(OCR·번역·편집 상태)를 에디터가 쓰는 UploadFile·스타일로 되돌리는 순수 함수들.
// 에디터 복원(store/uploads.tsx)과 내 데이터 받기의 완성 이미지 합성이 같은 결과를 내도록 한곳에 둔다.

export function fontForCategory(category: string | undefined): string {
  if (category === 'comic') return 'Bangers'
  if (category === 'cute') return 'Fredoka'
  if (category === 'handwriting') return 'Gaegu'
  if (category === 'minimal') return 'Gothic A1'
  // 기본값: 통통 둥근 이모티콘 친화 폰트(다중 굵기 지원 → 굵기 조절 가능).
  return 'Baloo 2'
}

// 원본 글자 시각 분석(fontStyle)이 있으면 일본어/중국어도 영어/한글처럼 손글씨·캐주얼·격식 폰트
// 중에서 가장 비슷한 걸 고른다. 분석이 실패했을 때만 언어별 기본 폰트 하나로 떨어진다 — 손도치
// 작가님 피드백(일본어/중국어 전용 폰트가 Noto Sans 하나뿐이라 분위기를 못 바꿈, 2026-10-28)으로 추가.
export function fontForLanguage(languageCode: string, suggestedFont: string, fontStyle?: FontStyleTag | null, seed?: string): string {
  if (languageCode === 'ja') return fontStyle ? pickFontByStyle(fontStyle, seed, 'ja') : 'Noto Sans JP'
  if (languageCode === 'zh') return fontStyle ? pickFontByStyle(fontStyle, seed, 'zh') : 'Noto Sans SC'
  return suggestedFont
}

/** 저장된 편집 상태(regionEditorStates)를 에디터 스타일 키로 옮겨 previous 위에 덮어쓴다. */
export function restoreStyles(files: UploadFile[], results: ProjectResults, languageCodes: string[], previous: StylesByLanguage = {}): StylesByLanguage {
  const restored = { ...previous }
  for (const file of files) {
    const asset = results.assets.find(result => result.id === file.assetId)
    for (const languageCode of languageCodes) {
      for (const region of asset?.ocr.regions ?? []) {
        const savedStyle = asset?.regionEditorStates?.[region.id]?.[languageCode]
        if (!savedStyle) continue
        const key = styleKeyForRegion(file.id, region.id, asset?.ocr.primaryRegionId)
        restored[key] = { ...restored[key], [languageCode]: savedStyle as Style }
      }
    }
  }
  return restored
}

/** 결과가 있는 파일에 OCR·번역 분석과 정리된 이미지 URL을 채운다. 결과가 없으면 그대로 돌려준다. */
export function restoreFile(file: UploadFile, results: ProjectResults, languageCodes: string[]): UploadFile {
  const asset = results.assets.find(result => result.id === file.assetId)
  if (!asset) return file
  return {
    ...file,
    // Editor의 변환 미리보기와 PNG export는 cleanup 결과를 base image로 사용해야 한다.
    // originalUrl은 좌측 원본 비교 화면에서 analysis.originalUrl로 별도 유지한다.
    url: asset.cleanedUrl ?? asset.originalUrl ?? file.url,
    analysis: {
      korean: asset.ocr.fullText ?? '',
      localizations: Object.fromEntries(languageCodes.map(languageCode => {
        const localization = asset.localizations[languageCode]
        // 원본 글자 시각 분석(font-style-vision.service.ts)이 있으면 그걸로 유사 폰트를
        // 찾고, 실패했을 때만 번역 LLM이 텍스트 뉘앙스로 찍은 카테고리로 대체한다.
        const suggestedFont = asset.ocr.fontStyle
          ? pickFontByStyle(asset.ocr.fontStyle, asset.id)
          : fontForCategory(localization?.recommendedStyle?.fontCategory)
        return [languageCode, {
          status: localization?.status ?? 'failed',
          suggestions: localization?.candidates ?? [],
          recommendedFont: fontForLanguage(languageCode, suggestedFont, asset.ocr.fontStyle, asset.id),
          recommendedAlignment: localization?.recommendedStyle?.alignment,
          strokeRecommended: localization?.recommendedStyle?.strokeRecommended,
          shadowRecommended: localization?.recommendedStyle?.shadowRecommended,
        }]
      })),
      originalUrl: asset.originalUrl,
      cleanedUrl: asset.cleanedUrl,
      width: asset.width,
      height: asset.height,
      regionId: asset.ocr.primaryRegionId,
      normalizedBox: asset.ocr.regions.find(region => region.id === asset.ocr.primaryRegionId)?.normalizedBox ?? null,
      cleanupMethod: asset.cleanup.method,
      cleanupQuality: asset.cleanup.quality,
      needsManualCleanup: asset.cleanup.needsManualCleanup,
      needsManualOcrReview: asset.needsManualOcrReview,
      textColor: asset.cleanup.textColor,
      regions: asset.ocr.regions.map(region => ({
        id: region.id,
        korean: region.text,
        normalizedBox: region.normalizedBox,
        localizations: Object.fromEntries(languageCodes.map(languageCode => {
          const localization = region.localizations[languageCode]
          const suggestedFont = region.fontStyle
            ? pickFontByStyle(region.fontStyle, region.id)
            : fontForCategory(localization?.recommendedStyle?.fontCategory)
          return [languageCode, {
            status: localization?.status ?? 'failed',
            suggestions: localization?.candidates ?? [],
            recommendedFont: fontForLanguage(languageCode, suggestedFont, region.fontStyle, region.id),
            recommendedAlignment: localization?.recommendedStyle?.alignment,
            strokeRecommended: localization?.recommendedStyle?.strokeRecommended,
            shadowRecommended: localization?.recommendedStyle?.shadowRecommended,
          }]
        })),
        needsManualCleanup: region.needsManualCleanup,
        needsManualOcrReview: region.needsManualReview,
        textColor: region.textColor,
      })),
    },
  }
}
