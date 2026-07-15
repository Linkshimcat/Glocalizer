export type TargetLanguage = "en" | "ja" | "zh" | "ko" | "es" | "fr" | "de"

export type TranslationStyle = "literal" | "natural" | "meme"

export interface TranslationCandidate {
  text: string
  type: TranslationStyle
  label: string
}

export interface BoundingBox {
  /** percentage values relative to the image (0-100) */
  x: number
  y: number
  width: number
  height: number
}

export interface TextStyle {
  fontFamily: string
  fontSize: number
  rotation: number
  color: string
  /** position in percentage of canvas (0-100) */
  x: number
  y: number
}

export interface ProjectImage {
  id: string
  originalFileName: string
  sourceText: string
  translations: TranslationCandidate[]
  selectedTranslation: string
  /** free-form manual edit of the phrase; falls back to selectedTranslation */
  editedText?: string
  boundingBox?: BoundingBox
  /** data URL for user-uploaded previews; undefined uses generated illustration */
  previewUrl?: string
  textStyle?: Partial<TextStyle>
}

export interface Project {
  id: string
  name: string
  targetLanguage: TargetLanguage
  translationStyle: TranslationStyle
  images: ProjectImage[]
}

export interface UploadedFile {
  id: string
  name: string
  size: number
  sourceText: string
  previewUrl?: string
  status: "success" | "error"
  errorReason?: string
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: "Pretendard",
  fontSize: 34,
  rotation: 0,
  color: "#191F28",
  x: 50,
  y: 78,
}

export const FONT_OPTIONS = [
  {
    label: "Pretendard",
    value: "Pretendard",
    css: "'Pretendard Variable', 'Pretendard', sans-serif",
  },
] as const

export const LANGUAGE_LABELS: Record<TargetLanguage, string> = {
  en: "영어",
  ja: "일본어",
  zh: "중국어",
  ko: "한국어",
  es: "스페인어",
  fr: "프랑스어",
  de: "독일어",
}

export const STYLE_LABELS: Record<TranslationStyle, string> = {
  literal: "직역",
  natural: "자연스러운 표현",
  meme: "밈·캐주얼",
}
