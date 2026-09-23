-- 문구의 위치·크기·색을 이미지마다 따로 둔다. 생성 직후 알파 채널을 재서 캐릭터를 덜 가리는
-- 쪽에 자동으로 놓고, 사용자가 덮어쓰면 그 값이 남는다. null이면 예전처럼 상단 중앙 기본값을
-- 쓰므로 기존 이미지는 그대로 보인다.
alter table public.generation_images add column caption_style jsonb;
