/**
 * GLM 번역 → 로컬 검증 → DeepSeek 검수까지 이어지는 5단계 전체를 실제 API로 확인하는 스크립트.
 * needsDeepSeekReview 조건과 무관하게 항상 DeepSeek를 호출해서 결과를 보여준다.
 *
 * 사용법: npx tsx scripts/test-review.ts "<한국어 문구>" <en|ja|zh> [tone] [audience] [style]
 */
import { glmLocalizationProvider } from '../src/ai/localization/glm-localization.provider.js';
import { validateTranslationResult } from '../src/ai/localization/localization-validator.js';
import { applyReviewResult } from '../src/ai/localization/localization.service.js';
import { tryReviewTranslation } from '../src/ai/review/review.service.js';
import { MAX_CHARACTERS_BY_LANGUAGE } from '../src/types/localization.js';
import type { LocalizationPromptInput, TargetLanguage } from '../src/types/localization.js';
import type { LocalizationOptions } from '../src/types/project.js';

async function main() {
  const [sourceText, targetLanguage, tone, audience, translationStyle] = process.argv.slice(2);

  if (!sourceText || !targetLanguage || !['en', 'ja', 'zh'].includes(targetLanguage)) {
    console.error('사용법: npx tsx scripts/test-review.ts "<한국어 문구>" <en|ja|zh> [tone] [audience] [style]');
    process.exit(1);
  }

  const lang = targetLanguage as TargetLanguage;
  const resolvedTone = (tone as LocalizationOptions['tone']) ?? 'cute';

  const input: LocalizationPromptInput = {
    sourceText,
    sourceLanguage: 'ko',
    targetLanguage: lang,
    context: {
      contentType: 'emoticon',
      tone: resolvedTone,
      audience: (audience as LocalizationOptions['audience']) ?? 'general',
      translationStyle: (translationStyle as LocalizationOptions['translationStyle']) ?? 'natural',
    },
    constraints: { maxCharacters: MAX_CHARACTERS_BY_LANGUAGE[lang], textBoxWidth: 200, textBoxHeight: 80 },
  };

  console.log('[1/4] GLM 5.2 호출 중...');
  const glmResult = await glmLocalizationProvider.localize(input);
  console.log('GLM 후보:');
  console.dir(glmResult.candidates, { depth: null });

  const validation = validateTranslationResult(glmResult);
  console.log('\n[2/4] 로컬 검증:', validation);

  console.log('\n[3/4] DeepSeek V4 Pro 검수 호출 중...');
  const reviewResult = await tryReviewTranslation({
    sourceText,
    targetLanguage: lang,
    candidates: glmResult.candidates.map((c) => ({ text: c.text, tone: c.tone, meaning: c.meaning })),
    requirements: { maxCharacters: MAX_CHARACTERS_BY_LANGUAGE[lang], contentType: 'emoticon', desiredTone: resolvedTone },
  });

  if (!reviewResult) {
    console.log('DeepSeek 검수 실패 → GLM 결과로 폴백');
    return;
  }
  console.log('DeepSeek 검수 결과:');
  console.dir(reviewResult, { depth: null });

  const finalCandidates = applyReviewResult(glmResult.candidates, reviewResult);
  console.log('\n[4/4] 최종 후보 (검수 반영):');
  console.dir(finalCandidates, { depth: null });
}

main().catch((err) => {
  console.error('리뷰 테스트 실패:', err);
  process.exit(1);
});
