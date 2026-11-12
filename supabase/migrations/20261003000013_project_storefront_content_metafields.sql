-- Project canonical storefront content into Shopify metafield sync state.
-- Supabase remains SSOT; Shopify is the storefront projection.

begin;

insert into public.shopify_metafield_registry (
  owner_type, namespace, key, name, data_type, domain, dynamic_role,
  source_of_truth, sync_direction, required_for_publish, storefront_visible,
  validation_rules, description, active, created_at, updated_at
)
values (
  'COLLECTION','leafer','care_guidance','Pflege & Anwendung',
  'multi_line_text_field','all','content',
  'supabase','to_shopify',false,true,
  '{}'::jsonb,
  'Praxisnahe Pflege- und Anwendungshinweise aus collection_content.',
  true,now(),now()
)
on conflict (owner_type,namespace,key) do update set
  name=excluded.name,
  data_type=excluded.data_type,
  domain=excluded.domain,
  dynamic_role=excluded.dynamic_role,
  source_of_truth=excluded.source_of_truth,
  sync_direction=excluded.sync_direction,
  required_for_publish=excluded.required_for_publish,
  storefront_visible=excluded.storefront_visible,
  description=excluded.description,
  active=true,
  updated_at=now();

create table if not exists public.shopify_collection_metafield_state (
  id uuid primary key default gen_random_uuid(),
  collection_gid text not null references public.collection_content(shopify_gid) on delete cascade,
  namespace text not null,
  key text not null,
  raw_value text,
  parsed_value jsonb,
  source_system text not null default 'supabase',
  validation_status text not null default 'valid',
  validation_errors jsonb not null default '[]'::jsonb,
  dirty_for_shopify boolean not null default true,
  shopify_updated_at timestamptz,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(collection_gid, namespace, key)
);

alter table public.shopify_collection_metafield_state enable row level security;
revoke all on table public.shopify_collection_metafield_state from public, anon, authenticated;
grant select, insert, update, delete on table public.shopify_collection_metafield_state to service_role;

create or replace function public.project_storefront_product_content_metafields(p_product_gid text default null)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
declare
  affected integer := 0;
begin
  with desired as (
    select p.product_gid, v.namespace, v.key, v.raw_value, v.parsed_value
    from public.storefront_product_content p
    cross join lateral (
      values
        ('custom','faq',
          case when p.faq is not null and p.faq <> '[]'::jsonb and p.faq <> '{}'::jsonb then p.faq::text end,
          case when p.faq is not null and p.faq <> '[]'::jsonb and p.faq <> '{}'::jsonb then p.faq end),
        ('leafer','intro',
          nullif(btrim(p.intro),''),
          case when nullif(btrim(p.intro),'') is not null then to_jsonb(p.intro) end),
        ('leafer','subtitle',
          nullif(btrim(p.subtitle),''),
          case when nullif(btrim(p.subtitle),'') is not null then to_jsonb(p.subtitle) end),
        ('leafer','primary_function',
          nullif(btrim(p.primary_function),''),
          case when nullif(btrim(p.primary_function),'') is not null then to_jsonb(p.primary_function) end),
        ('leafer','suitable_for',
          case when p.use_cases is not null and p.use_cases <> '[]'::jsonb then p.use_cases::text end,
          case when p.use_cases is not null and p.use_cases <> '[]'::jsonb then p.use_cases end),
        ('leafer','usp_1',
          nullif(btrim(p.benefits->>0),''),
          case when nullif(btrim(p.benefits->>0),'') is not null then to_jsonb(p.benefits->>0) end),
        ('leafer','usp_2',
          nullif(btrim(p.benefits->>1),''),
          case when nullif(btrim(p.benefits->>1),'') is not null then to_jsonb(p.benefits->>1) end),
        ('leafer','usp_3',
          nullif(btrim(p.benefits->>2),''),
          case when nullif(btrim(p.benefits->>2),'') is not null then to_jsonb(p.benefits->>2) end),
        ('leafer','application_steps',
          case when p.application_steps is not null and p.application_steps <> '[]'::jsonb then p.application_steps::text end,
          case when p.application_steps is not null and p.application_steps <> '[]'::jsonb then p.application_steps end),
        ('leafer','ingredients',
          case when p.ingredients is not null and p.ingredients <> '[]'::jsonb then p.ingredients::text end,
          case when p.ingredients is not null and p.ingredients <> '[]'::jsonb then p.ingredients end),
        ('leafer','mixing_ratio',
          nullif(btrim(p.mixing_ratio),''),
          case when nullif(btrim(p.mixing_ratio),'') is not null then to_jsonb(p.mixing_ratio) end),
        ('leafer','primary_search_term',
          nullif(btrim(p.primary_search_term),''),
          case when nullif(btrim(p.primary_search_term),'') is not null then to_jsonb(p.primary_search_term) end),
        ('leafer','search_terms',
          case when p.search_terms is not null and p.search_terms <> '[]'::jsonb then p.search_terms::text end,
          case when p.search_terms is not null and p.search_terms <> '[]'::jsonb then p.search_terms end)
    ) as v(namespace,key,raw_value,parsed_value)
    join public.shopify_metafield_registry r
      on r.owner_type='PRODUCT'
     and r.namespace=v.namespace
     and r.key=v.key
     and r.active
     and r.source_of_truth='supabase'
     and r.sync_direction in ('to_shopify','bidirectional')
    where (p_product_gid is null or p.product_gid=p_product_gid)
      and v.raw_value is not null
  ),
  upserted as (
    insert into public.shopify_metafield_state (
      product_gid,namespace,key,raw_value,parsed_value,source_system,
      validation_status,validation_errors,dirty_for_shopify,dirty_for_supabase,
      updated_at
    )
    select
      d.product_gid,d.namespace,d.key,d.raw_value,d.parsed_value,'supabase',
      'valid','[]'::jsonb,true,false,now()
    from desired d
    on conflict (product_gid,namespace,key) do update set
      raw_value=excluded.raw_value,
      parsed_value=excluded.parsed_value,
      source_system='supabase',
      validation_status='valid',
      validation_errors='[]'::jsonb,
      dirty_for_shopify=(
        public.shopify_metafield_state.dirty_for_shopify
        or public.shopify_metafield_state.raw_value is distinct from excluded.raw_value
      ),
      dirty_for_supabase=false,
      updated_at=now()
    returning 1
  )
  select count(*) into affected from upserted;

  return affected;
end;
$function$;

create or replace function public.project_collection_content_metafields(p_collection_gid text default null)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
declare
  affected integer := 0;
begin
  with desired as (
    select c.shopify_gid as collection_gid, v.namespace, v.key, v.raw_value, v.parsed_value
    from public.collection_content c
    cross join lateral (
      values
        ('custom','homepage_eyebrow',
          nullif(btrim(c.homepage_eyebrow),''),
          case when nullif(btrim(c.homepage_eyebrow),'') is not null then to_jsonb(c.homepage_eyebrow) end),
        ('custom','homepage_intro',
          nullif(btrim(c.homepage_intro),''),
          case when nullif(btrim(c.homepage_intro),'') is not null then to_jsonb(c.homepage_intro) end),
        ('custom','homepage_badge',
          nullif(btrim(c.homepage_badge),''),
          case when nullif(btrim(c.homepage_badge),'') is not null then to_jsonb(c.homepage_badge) end),
        ('custom','homepage_cta',
          nullif(btrim(c.homepage_cta),''),
          case when nullif(btrim(c.homepage_cta),'') is not null then to_jsonb(c.homepage_cta) end),
        ('custom','homepage_icon',
          nullif(btrim(c.homepage_icon),''),
          case when nullif(btrim(c.homepage_icon),'') is not null then to_jsonb(c.homepage_icon) end),
        ('leafer','intro',
          nullif(btrim(c.short_intro),''),
          case when nullif(btrim(c.short_intro),'') is not null then to_jsonb(c.short_intro) end),
        ('leafer','guide',
          nullif(btrim(c.buying_guide),''),
          case when nullif(btrim(c.buying_guide),'') is not null then to_jsonb(c.buying_guide) end),
        ('leafer','care_guidance',
          nullif(btrim(c.care_guidance),''),
          case when nullif(btrim(c.care_guidance),'') is not null then to_jsonb(c.care_guidance) end),
        ('leafer','faq',
          case when c.faq is not null and c.faq <> '[]'::jsonb and c.faq <> '{}'::jsonb then c.faq::text end,
          case when c.faq is not null and c.faq <> '[]'::jsonb and c.faq <> '{}'::jsonb then c.faq end),
        ('leafer','keywords',
          case when c.secondary_keywords is not null and c.secondary_keywords <> '[]'::jsonb then c.secondary_keywords::text end,
          case when c.secondary_keywords is not null and c.secondary_keywords <> '[]'::jsonb then c.secondary_keywords end),
        ('leafer','longtail_keywords',
          case when c.longtail_keywords is not null and c.longtail_keywords <> '[]'::jsonb then c.longtail_keywords::text end,
          case when c.longtail_keywords is not null and c.longtail_keywords <> '[]'::jsonb then c.longtail_keywords end),
        ('leafer','primary_intent',
          nullif(btrim(c.primary_intent),''),
          case when nullif(btrim(c.primary_intent),'') is not null then to_jsonb(c.primary_intent) end)
    ) as v(namespace,key,raw_value,parsed_value)
    join public.shopify_metafield_registry r
      on r.owner_type='COLLECTION'
     and r.namespace=v.namespace
     and r.key=v.key
     and r.active
     and r.source_of_truth='supabase'
     and r.sync_direction in ('to_shopify','bidirectional')
    where (p_collection_gid is null or c.shopify_gid=p_collection_gid)
      and v.raw_value is not null
  ),
  upserted as (
    insert into public.shopify_collection_metafield_state (
      collection_gid,namespace,key,raw_value,parsed_value,source_system,
      validation_status,validation_errors,dirty_for_shopify,updated_at
    )
    select
      d.collection_gid,d.namespace,d.key,d.raw_value,d.parsed_value,'supabase',
      'valid','[]'::jsonb,true,now()
    from desired d
    on conflict (collection_gid,namespace,key) do update set
      raw_value=excluded.raw_value,
      parsed_value=excluded.parsed_value,
      source_system='supabase',
      validation_status='valid',
      validation_errors='[]'::jsonb,
      dirty_for_shopify=(
        public.shopify_collection_metafield_state.dirty_for_shopify
        or public.shopify_collection_metafield_state.raw_value is distinct from excluded.raw_value
      ),
      updated_at=now()
    returning 1
  )
  select count(*) into affected from upserted;

  return affected;
end;
$function$;

create or replace function public.trg_project_storefront_product_content()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
begin
  perform public.project_storefront_product_content_metafields(new.product_gid);
  return new;
end;
$function$;

drop trigger if exists project_storefront_product_content_metafields
  on public.storefront_product_content;
create trigger project_storefront_product_content_metafields
after insert or update of
  subtitle,intro,primary_function,ingredients,mixing_ratio,application_steps,
  benefits,use_cases,faq,primary_search_term,search_terms
on public.storefront_product_content
for each row execute function public.trg_project_storefront_product_content();

create or replace function public.trg_project_collection_content()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
begin
  perform public.project_collection_content_metafields(new.shopify_gid);
  return new;
end;
$function$;

drop trigger if exists project_collection_content_metafields
  on public.collection_content;
create trigger project_collection_content_metafields
after insert or update of
  short_intro,buying_guide,care_guidance,faq,secondary_keywords,longtail_keywords,
  homepage_eyebrow,homepage_intro,homepage_badge,homepage_cta,homepage_icon,primary_intent
on public.collection_content
for each row execute function public.trg_project_collection_content();

revoke all on function public.project_storefront_product_content_metafields(text) from public, anon, authenticated;
revoke all on function public.project_collection_content_metafields(text) from public, anon, authenticated;
revoke all on function public.trg_project_storefront_product_content() from public, anon, authenticated;
revoke all on function public.trg_project_collection_content() from public, anon, authenticated;
grant execute on function public.project_storefront_product_content_metafields(text) to service_role;
grant execute on function public.project_collection_content_metafields(text) to service_role;

select public.project_storefront_product_content_metafields(null);
select public.project_collection_content_metafields(null);

commit;
