alter table public.ocr_regions
  add column if not exists font_style jsonb;

comment on column public.ocr_regions.font_style is '원본 글자 이미지를 Vision 모델로 분석한 시각적 특성 {weight, roundness, handwritten, formality}. 번역 텍스트 폰트를 원본과 유사하게 고르는 데 사용. 분석 실패 시 null.';
