alter table public.ocr_regions
  add column if not exists source text not null default 'paddle-consensus',
  add column if not exists agreement_score numeric not null default 0,
  add column if not exists needs_manual_review boolean not null default false;

alter table public.ocr_regions
  add constraint ocr_regions_source_check check (source in ('paddle-consensus', 'vision-fallback')) not valid;
