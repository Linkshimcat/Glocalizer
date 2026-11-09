-- AI 문구 추천(글자 없는 이모티콘)으로 넣은 문구 영역을 구분한다. 원본에 지울 글자가 없으므로
-- 백엔드가 이 영역의 이미지 정리(글자 지우기)와 원본 글자 폰트 분석을 건너뛴다.
alter table public.ocr_regions drop constraint if exists ocr_regions_source_check;
alter table public.ocr_regions
  add constraint ocr_regions_source_check
  check (source in ('paddle-consensus', 'vision-fallback', 'caption-suggestion')) not valid;
