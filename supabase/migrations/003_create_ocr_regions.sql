create table ocr_regions (
  id uuid primary key default gen_random_uuid(),

  asset_id uuid not null
    references assets(id)
    on delete cascade,

  detected_text text not null,
  confidence real not null,

  bbox jsonb not null,
  normalized_bbox jsonb,
  polygon jsonb,

  contains_korean boolean not null default false,
  is_primary boolean not null default false,
  reading_order integer not null default 0,

  created_at timestamptz not null default now()
);

create index ocr_regions_asset_id_idx on ocr_regions (asset_id);
