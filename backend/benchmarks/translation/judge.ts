import type { Caption } from './dataset.js';
import { chat } from './llm.js';

export const LANGS = ['en', 'ja', 'zh'] as const;
export type Lang = (typeof LANGS)[number];
export const MAX_CHARS: Record<Lang, number> = { en: 18, ja: 12, zh: 10 };

export interface CandidateScore { fidelity: number; naturalness: number; tone: number; sticker: number; problem: string }
export type JudgedCaption = Record<Lang, CandidateScore[]>;

const RUBRIC = `You are a strict, expert localization reviewer for Korean emoticon/sticker captions (Korean -> English, Japanese, Simplified Chinese).
Score every candidate independently on 1-5 (integers, be discriminating; 3 = acceptable, 5 = flawless native quality):
- fidelity: preserves the meaning, intent and emotional force of the Korean. Penalize invented content, omitted meaning, wrong meaning, mistranslated slang. Do NOT reward humor that changes the meaning.
- naturalness: reads like something a native speaker would really write/say (not translationese, no awkward literalism, correct grammar/spelling, natural in that language's internet culture for slang).
- tone: matches the register and mood of the source (politeness level, warmth, sarcasm, cuteness, seriousness). A formal apology must stay sincere; playful slang should stay playful.
- sticker: works as short sticker text within the character limit: punchy, complete, sensible punctuation/emoji usage, not cut off, no explanations or brackets.
Also give "problem": a very short phrase describing the main flaw, or "" if none.
Return JSON only: {"en":[{"fidelity":n,"naturalness":n,"tone":n,"sticker":n,"problem":"..."}, ...], "ja":[...], "zh":[...]} with exactly one object per candidate, in the given order.`;

export async function judgeCaption(caption: Caption, candidates: Record<Lang, string[]>, model = 'gpt-5.6'): Promise<JudgedCaption> {
  const payload = {
    korean: caption.ko,
    intent_note: caption.note,
    character_limits: MAX_CHARS,
    candidates: Object.fromEntries(LANGS.map((lang) => [lang, candidates[lang].map((text) => text)])),
  };
  const result = await chat([{ role: 'system', content: RUBRIC }, { role: 'user', content: JSON.stringify(payload) }], { provider: 'openai', model, reasoningEffort: 'low', maxTokens: 4000 });
  const parsed = JSON.parse(result.content) as Record<string, CandidateScore[]>;
  const judged = {} as JudgedCaption;
  for (const lang of LANGS) {
    const scores = parsed[lang] ?? [];
    judged[lang] = candidates[lang].map((_, index) => {
      const score = scores[index];
      const clamp = (value: unknown) => Math.min(5, Math.max(1, Math.round(Number(value) || 1)));
      return { fidelity: clamp(score?.fidelity), naturalness: clamp(score?.naturalness), tone: clamp(score?.tone), sticker: clamp(score?.sticker), problem: String(score?.problem ?? '') };
    });
  }
  return judged;
}

export const overall = (score: CandidateScore): number => (score.fidelity * 0.35 + score.naturalness * 0.3 + score.tone * 0.2 + score.sticker * 0.15);
