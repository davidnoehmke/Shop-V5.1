alter table public.collection_content
  add column if not exists homepage_eyebrow text,
  add column if not exists homepage_intro text,
  add column if not exists homepage_badge text,
  add column if not exists homepage_cta text,
  add column if not exists homepage_icon text;

comment on column public.collection_content.homepage_eyebrow is 'Homepage collection-card eyebrow copied from the current validated Shopify runtime and owned by Supabase SSOT.';
comment on column public.collection_content.homepage_intro is 'Homepage collection-card intro copied from the current validated Shopify runtime and owned by Supabase SSOT.';
comment on column public.collection_content.homepage_badge is 'Homepage collection-card badge copied from the current validated Shopify runtime and owned by Supabase SSOT.';
comment on column public.collection_content.homepage_cta is 'Homepage collection-card CTA copied from the current validated Shopify runtime and owned by Supabase SSOT.';
comment on column public.collection_content.homepage_icon is 'Homepage collection-card icon token copied from the current validated Shopify runtime and owned by Supabase SSOT.';
