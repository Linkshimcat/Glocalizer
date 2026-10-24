import { z } from 'zod';

const koreanExplanation = z.string().trim().min(1).max(600).regex(/[가-힣]/, '한국어 설명이 필요합니다.');
export const japaneseMeaningSchema = z.object({
  meaning: koreanExplanation,
  register: koreanExplanation,
  usage: koreanExplanation,
  nuance: koreanExplanation,
  recommendation: koreanExplanation,
});
export const explainJapaneseSchema = z.object({
  regionId: z.string().uuid(),
  text: z.string().trim().min(1).max(300).regex(/[\u3040-\u30ff\u3400-\u9fff々]/, '일본어 문구를 입력해주세요.'),
});
