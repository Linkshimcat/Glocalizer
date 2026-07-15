import type {
  ProjectImage,
  TargetLanguage,
  TranslationCandidate,
} from "@/types/project"
import { MOCK_SOURCE_PHRASES } from "@/data/sampleProject"

/** A small offline "dictionary" of Korean emoticon phrases → candidate translations. */
const DICTIONARY: Record<
  string,
  Partial<Record<TargetLanguage, { literal: string; natural: string; meme: string }>>
> = {
  열공: {
    en: { literal: "Study hard", natural: "Grinding", meme: "Locked in" },
    ja: { literal: "猛勉強", natural: "勉強頑張る", meme: "ガチ勉中" },
  },
  대박: {
    en: { literal: "Amazing", natural: "No way!", meme: "Slay!" },
    ja: { literal: "すごい", natural: "まじで！", meme: "神ってる" },
  },
  인정: {
    en: { literal: "I agree", natural: "For real", meme: "Fr" },
    ja: { literal: "認める", natural: "たしかに", meme: "それな" },
  },
  행복: {
    en: { literal: "Happiness", natural: "So happy", meme: "Pure vibes" },
    ja: { literal: "幸福", natural: "しあわせ", meme: "ぴえん超え" },
  },
  화이팅: {
    en: { literal: "Fighting!", natural: "You got this", meme: "Let's go!" },
    ja: { literal: "ファイト", natural: "がんばれ", meme: "いけいけ！" },
  },
  최고: {
    en: { literal: "The best", natural: "Awesome", meme: "GOAT" },
    ja: { literal: "最高", natural: "さいこう", meme: "優勝" },
  },
}

const FALLBACK: Record<TargetLanguage, { literal: string; natural: string; meme: string }> = {
  en: { literal: "Nice", natural: "So good", meme: "Vibes" },
  ja: { literal: "いいね", natural: "すごくいい", meme: "最of高" },
  zh: { literal: "很好", natural: "太棒了", meme: "绝绝子" },
  ko: { literal: "좋아요", natural: "정말 좋아", meme: "완전 레전드" },
  es: { literal: "Bien", natural: "¡Qué bueno!", meme: "¡Brutal!" },
  fr: { literal: "Bien", natural: "Trop bien !", meme: "Incroyable !" },
  de: { literal: "Gut", natural: "Richtig gut!", meme: "Mega!" },
}

export function pickMockSourcePhrase(index: number) {
  return MOCK_SOURCE_PHRASES[index % MOCK_SOURCE_PHRASES.length]
}

export function buildCandidates(
  sourceText: string,
  language: TargetLanguage,
): TranslationCandidate[] {
  const entry = DICTIONARY[sourceText]?.[language] ?? FALLBACK[language]
  return [
    { text: entry.literal, type: "literal", label: "직역" },
    { text: entry.natural, type: "natural", label: "자연스러운 표현" },
    { text: entry.meme, type: "meme", label: "밈·캐주얼" },
  ]
}

/** Build a fully-translated ProjectImage from a detected source phrase. */
export function buildProjectImage(
  id: string,
  fileName: string,
  sourceText: string,
  language: TargetLanguage,
  preferredStyle: "literal" | "natural" | "meme",
  previewUrl?: string,
): ProjectImage {
  const translations = buildCandidates(sourceText, language)
  const preferred =
    translations.find((t) => t.type === preferredStyle) ?? translations[0]
  return {
    id,
    originalFileName: fileName,
    sourceText,
    translations,
    selectedTranslation: preferred.text,
    previewUrl,
    boundingBox: { x: 30, y: 16, width: 40, height: 22 },
  }
}
