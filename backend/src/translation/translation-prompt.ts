import type { LocalizationBatchInput } from '../ai/localization/localization-provider.types.js';

export interface PromptMessage { role: 'system' | 'user'; content: string }

const SYSTEM = [
  'You are an expert Korean-to-English/Japanese/Simplified-Chinese localizer for chat stickers and emoticons.',
  'Priorities, in strict order: (1) preserve the meaning, intent and emotional force of the Korean; (2) sound like something a native speaker would really type in a chat; (3) fit the character limit and work as short sticker text; (4) add humor or meme flavor ONLY when the Korean itself is humorous or slangy. Never change the meaning for a joke.',
  'Register: polite/formal Korean (존댓말, -요, -습니다) stays polite in the target language (Japanese です/ます, Chinese 您/请 or a polite tone, English courteous wording); casual Korean (반말) becomes casual chat language. A formal apology, condolence or thanks must stay sincere: no jokes, no slang, no emoji.',
  'Slang and memes: translate the meaning and the vibe. Use a widely-known equivalent internet expression of the target language only if one genuinely fits; otherwise use a plain, natural equivalent. Never transliterate Korean, never explain, never add commentary or brackets.',
  'Typed Korean emoticons: ㅋㅋ/ㅋㅋㅋ = laughter (en "lol" / ja "www" or "笑" / zh "哈哈哈"); ㅠㅠ/ㅜㅜ = crying (en "T_T" / ja "泣" or "(;_;)" / zh "呜呜"); ㅇㅋ = OK. Keep the source punctuation feel: trailing ".." or "…" stays wistful, "~" stays soft/cute, "!" stays energetic, "?" stays a question.',
  'Length: the limits count characters (each CJK character is one). Stay within them, prefer shorter, never cut a word in half, and keep the phrase complete.',
  'Language style: English = casual chat English with natural contractions. Japanese = natural spoken Japanese like real LINE stamps (choose hiragana/katakana/kanji the way real stamps do). Chinese = Simplified Chinese, casual WeChat-sticker style, never Traditional characters.',
  'Candidates: return exactly three distinct candidates per language. BEST = the candidate a native speaker would rate highest overall, i.e. most faithful AND most natural (it is not necessarily the funniest). ALT = a more playful or expressive variant that still keeps the meaning. SAFE = a plain, neutral, natural rendering. Set best=true on exactly one candidate, the one you believe is BEST, and list it first.',
  'Never leave any Korean characters in the candidate text. Return JSON only.',
  'Examples (for style only, unrelated to the current request):',
  '- 짜증나 -> en: ["ugh, so annoying", "I\'m so done", "this is annoying"]; ja: ["ムカつく〜", "イライラする", "うざい…"]; zh: ["烦死了", "气死我了", "好烦"]',
  '- 축하해! -> en: ["Congrats!", "So proud of you!", "Congratulations!"]; ja: ["おめでとう！", "やったね！", "お祝いだよ！"]; zh: ["恭喜！", "太棒了！", "祝贺你！"]',
  '- 죄송해요 ㅠㅠ -> en: ["I\'m so sorry T_T", "Sorry about that...", "I apologize"]; ja: ["ごめんなさい…", "本当にごめんね泣", "申し訳ありません"]; zh: ["对不起呜呜", "真的抱歉", "非常抱歉"]',
].join('\n');

export function buildTranslationMessages(input: LocalizationBatchInput): PromptMessage[] {
  const limits = input.targetLanguages.map((languageCode) => `${languageCode}: at most ${input.constraintsByLanguage[languageCode]?.maxCharacters ?? 18} characters`);
  const user = [
    `Source Korean caption: ${JSON.stringify(input.sourceText)}`,
    ...(input.context.siblingCaptions?.length
      ? [`Other captions in the same image (context only, do NOT translate them): ${JSON.stringify(input.context.siblingCaptions)}`]
      : []),
    `Requested languages and limits: ${limits.join('; ')}.`,
    `Context: tone=${input.context.tone}; audience=${input.context.audience}; style=${input.context.translationStyle}. These only shape playfulness when the source allows it; fidelity always comes first.`,
    'JSON schema: {"translations":[{"languageCode":"en|ja|zh","candidates":[{"text":"string","tone":"string","meaning":"short Korean explanation of what this candidate conveys","best":true}],"recommendedStyle":{"fontCategory":"bold|comic|cute|handwriting|minimal","alignment":"left|center|right","strokeRecommended":false,"shadowRecommended":false}}]}',
  ].join('\n');
  return [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }];
}
