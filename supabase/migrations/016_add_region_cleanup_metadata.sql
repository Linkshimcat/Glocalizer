alter table public.ocr_regions
  add column if not exists text_color jsonb,
  add column if not exists needs_manual_cleanup boolean not null default false;
