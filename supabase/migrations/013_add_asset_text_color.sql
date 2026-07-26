alter table public.assets
  add column if not exists text_color jsonb;

comment on column public.assets.text_color is '원본 이미지에서 감지한 대표 글자색 {r,g,b}. 번역 텍스트 기본 색으로 사용. 감지 실패 시 null.';
