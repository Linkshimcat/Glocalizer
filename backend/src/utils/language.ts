const HANGUL_PATTERN = /[가-힣ᄀ-ᇿ㄰-㆏]/;
const KANA_PATTERN = /[぀-ゟ゠-ヿ]/; // 히라가나 + 가타카나
const HAN_PATTERN = /[一-鿿]/; // 한자/한자 어원 (중국어 간체·번체, 일본어 한자 공통)
const LATIN_PATTERN = /[A-Za-z]/;

export function containsKorean(text: string): boolean {
  return HANGUL_PATTERN.test(text);
}

export function containsJapaneseKana(text: string): boolean {
  return KANA_PATTERN.test(text);
}

export function containsHanScript(text: string): boolean {
  return HAN_PATTERN.test(text);
}

export function containsLatin(text: string): boolean {
  return LATIN_PATTERN.test(text);
}
