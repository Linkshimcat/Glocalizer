import type { Project } from "@/types/project"

export const sampleProject: Project = {
  id: "demo-project",
  name: "글로벌 이모티콘 세트",
  targetLanguage: "en",
  translationStyle: "natural",
  images: [
    {
      id: "sample-1",
      originalFileName: "emoticon_01.png",
      sourceText: "열공",
      translations: [
        { text: "Study hard", type: "literal", label: "직역" },
        { text: "Grinding", type: "natural", label: "자연스러운 표현" },
        { text: "Locked in", type: "meme", label: "밈·캐주얼" },
      ],
      selectedTranslation: "Grinding",
    },
    {
      id: "sample-2",
      originalFileName: "emoticon_02.png",
      sourceText: "대박",
      translations: [
        { text: "Amazing", type: "literal", label: "직역" },
        { text: "No way!", type: "natural", label: "자연스러운 표현" },
        { text: "Slay!", type: "meme", label: "밈·캐주얼" },
      ],
      selectedTranslation: "No way!",
    },
    {
      id: "sample-3",
      originalFileName: "emoticon_03.png",
      sourceText: "인정",
      translations: [
        { text: "I agree", type: "literal", label: "직역" },
        { text: "For real", type: "natural", label: "자연스러운 표현" },
        { text: "Fr", type: "meme", label: "밈·캐주얼" },
      ],
      selectedTranslation: "For real",
    },
  ],
}

/** Phrases we can "detect" for freshly uploaded mock files. */
export const MOCK_SOURCE_PHRASES = [
  "열공",
  "대박",
  "인정",
  "행복",
  "화이팅",
  "최고",
];
