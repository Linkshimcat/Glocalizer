create table editor_states (
  id uuid primary key default gen_random_uuid(),

  asset_id uuid not null
    references assets(id)
    on delete cascade,

  ocr_region_id uuid
    references ocr_regions(id)
    on delete cascade,

  language_code text not null,
  style jsonb not null,

  updated_at timestamptz not null default now(),

  unique (asset_id, ocr_region_id, language_code)
);
