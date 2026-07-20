create table translations (
  id uuid primary key default gen_random_uuid(),

  ocr_region_id uuid not null
    references ocr_regions(id)
    on delete cascade,

  language_code text not null,

  glm_candidates jsonb not null,
  review_result jsonb,
  final_candidates jsonb not null,

  recommended_style jsonb,

  generation_model text not null,
  review_model text,
  prompt_version text not null,

  created_at timestamptz not null default now(),

  unique (ocr_region_id, language_code)
);
