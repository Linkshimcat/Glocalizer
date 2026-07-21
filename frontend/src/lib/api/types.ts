export type TargetLanguageCode = 'en' | 'ja' | 'zh'

export interface ProjectSession {
  projectId: string
  projectToken: string
  expiresAt: string
}

export interface CreateProjectRequest {
  targetLanguages: TargetLanguageCode[]
  options: {
    tone: 'cute'
    audience: 'general'
    translationStyle: 'natural'
    highQualityReview: boolean
  }
  files: Array<{ clientId: string; name: string; mimeType: 'image/png' | 'image/jpeg'; size: number }>
}

export interface CreateProjectResponse extends ProjectSession {
  assets: Array<{ assetId: string; clientId: string; uploadUrl: string }>
}

export interface ProjectStatusResponse {
  projectId: string
  status: 'created' | 'processing' | 'completed' | 'failed' | 'expired'
  stage: string | null
  progress: number
  message: string
  assets: Array<{ assetId: string; status: string; progress: number; errorCode?: string; errorMessage?: string }>
}

export interface TranslationCandidate {
  text: string
  tone: string
  meaning: string
  best: boolean
}

export interface ProjectResultAsset {
  id: string
  name: string
  type: string
  width: number | null
  height: number | null
  status: string
  originalUrl: string | null
  cleanedUrl: string | null
  ocr: {
    fullText: string | null
    primaryRegionId: string | null
    regions: Array<{
      id: string
      text: string
      confidence: number
      box: { x: number; y: number; width: number; height: number }
      localizations: Record<TargetLanguageCode, { candidates: TranslationCandidate[]; recommendedStyle: unknown } | undefined>
    }>
  }
  localizations: Record<TargetLanguageCode, { candidates: TranslationCandidate[]; recommendedStyle: unknown } | undefined>
  cleanup: { method: string | null; quality: string | null; needsManualCleanup: boolean }
  errorCode?: string
  errorMessage?: string
}

export interface ProjectResultsResponse {
  projectId: string
  status: string
  targetLanguages: TargetLanguageCode[]
  assets: ProjectResultAsset[]
}
