create table if not exists public.grow_calendar_crops (
  slug text primary key,
  names jsonb not null,
  category text not null check (category in ('vegetables','herbs','flowers','fruit')),
  timing jsonb not null default '{}'::jsonb,
  cultivation_note_de text,
  cultivation_note_en text,
  source_refs jsonb not null default '[]'::jsonb,
  review_status text not null default 'draft' check (review_status in ('draft','verified','rejected')),
  is_published boolean not null default false,
  approved_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint grow_calendar_names_object check (jsonb_typeof(names) = 'object'),
  constraint grow_calendar_timing_object check (jsonb_typeof(timing) = 'object'),
  constraint grow_calendar_publish_guard check (not is_published or (review_status = 'verified' and approved_at is not null))
);
comment on table public.grow_calendar_crops is 'LEAF Grow Calendar canonical crop windows; publish only after botanical verification. Shopify public page remains a separate projection.';
alter table public.grow_calendar_crops enable row level security;
grant select on public.grow_calendar_crops to anon, authenticated;
revoke insert, update, delete on public.grow_calendar_crops from anon, authenticated;
create policy "Verified grow-calendar crops are public" on public.grow_calendar_crops for select to anon, authenticated using (is_published and review_status = 'verified');
create index if not exists grow_calendar_crops_category_idx on public.grow_calendar_crops (category) where is_published = true;
