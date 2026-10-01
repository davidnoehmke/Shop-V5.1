alter table public.collection_content
  add column if not exists primary_intent text;

comment on column public.collection_content.primary_intent is 'Canonical collection-level customer decision intent projected to Shopify leafer.primary_intent.';
