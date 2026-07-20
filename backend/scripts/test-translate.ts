/**
 * GLM 5.2 문화적 번역을 실제 API로 바로 호출해보는 수동 검증 스크립트. DB/Storage 없이 동작한다.
 *
 * 사용법: npx tsx scripts/test-translate.ts "<한국어 문구>" <en|ja|zh> [tone] [audience] [style]
 * 예:     npx tsx scripts/test-translate.ts "열공" en funny teen trendy
 */
import { glmLocalizationProvider } from '../src/ai/localization/glm-localization.provider.js';
import { validateTranslationResult } from '../src/ai/localization/localization-validator.js';
import { MAX_CHARACTERS_BY_LANGUAGE } from '../src/types/localization.js';
import type { LocalizationPromptInput, TargetLanguage } from '../src/types/localization.js';
import type { LocalizationOptions } from '../src/types/project.js';

async function main() {
  const [sourceText, targetLanguage, tone, audience, translationStyle] = process.argv.slice(2);

  if (!sourceText || !targetLanguage) {
    console.error('사용법: npx tsx scripts/test-translate.ts "<한국어 문구>" <en|ja|zh> [tone] [audience] [style]');
    process.exit(1);
  }
  if (!['en', 'ja', 'zh'].includes(targetLanguage)) {
    console.error('targetLanguage는 en/ja/zh 중 하나여야 합니다.');
    process.exit(1);
  }

  const input: LocalizationPromptInput = {
    sourceText,
    sourceLanguage: 'ko',
    targetLanguage: targetLanguage as TargetLanguage,
    context: {
      contentType: 'emoticon',
      tone: (tone as LocalizationOptions['tone']) ?? 'cute',
      audience: (audience as LocalizationOptions['audience']) ?? 'general',
      translationStyle: (translationStyle as LocalizationOptions['translationStyle']) ?? 'natural',
    },
    constraints: {
      maxCharacters: MAX_CHARACTERS_BY_LANGUAGE[targetLanguage as TargetLanguage],
      textBoxWidth: 200,
      textBoxHeight: 80,
    },
  };

  console.log('[1/2] GLM 5.2 호출 중...', input.context);
  const result = await glmLocalizationProvider.localize(input);

  console.log('\n[2/2] 결과:');
  console.dir(result, { depth: null });

  const validation = validateTranslationResult(result);
  console.log('\n검증 결과:');
  console.dir(validation, { depth: null });
}

main().catch((err) => {
  console.error('번역 테스트 실패:', err);
  process.exit(1);
});
