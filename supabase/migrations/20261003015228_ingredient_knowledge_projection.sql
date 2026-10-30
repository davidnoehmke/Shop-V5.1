-- Knowledge-first ingredient explanations projected from Supabase SSOT into Shopify.
-- Generated from approved storefront product content; Shopify remains the storefront projection.

insert into public.shopify_metafield_registry (
  owner_type, namespace, key, name, data_type, domain, dynamic_role,
  source_of_truth, sync_direction, required_for_publish, storefront_visible,
  validation_rules, description, active, created_at, updated_at
)
values (
  'PRODUCT','leafer','ingredient_info','Bestandteil-Wissen','json','all','content',
  'supabase','to_shopify',false,true,
  '{}'::jsonb,
  'Knowledge-first ingredient explanations derived from approved Supabase product content.',
  true,now(),now()
)
on conflict (owner_type,namespace,key) do update set
  name=excluded.name,
  data_type=excluded.data_type,
  source_of_truth=excluded.source_of_truth,
  sync_direction=excluded.sync_direction,
  storefront_visible=excluded.storefront_visible,
  description=excluded.description,
  active=true,
  updated_at=now();

create or replace function public.build_ingredient_info(p_ingredients jsonb)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $function$
  with raw_items as (
    select value::text as raw_label, ordinality
    from jsonb_array_elements_text(coalesce(p_ingredients,'[]'::jsonb)) with ordinality
  ),
  mapped as (
    select
      raw_label,
      ordinality,
      case
        when lower(raw_label) like '%pinienrinde%' then 'leaferpinienrinde-premium-pinienrinde'
        when lower(raw_label) like '%perlite%' or lower(raw_label) like '%expandiertes vulkangestein%' then 'leaferperlite-premium-perlite'
        when lower(raw_label) like '%bims%' then 'leaferbims-premium-bims'
        when lower(raw_label) like '%lavagestein%' or lower(raw_label) like 'lava %' or lower(raw_label) like '% lava %' then 'leaferlavatm-premium-lavagranulat'
        when lower(raw_label) like '%blähton%' or lower(raw_label) like '%blaehton%' or lower(raw_label) like '%gebrannter ton%' then 'leaferclay-premium-blahton'
        when lower(raw_label) like '%vermicul%' then 'leafervermiculite-premium-vermiculite'
        when lower(raw_label) like '%wurmhumus%' then 'wurmhumus-organische-nahrstoffkomponente'
        when lower(raw_label) like '%zeolith%' then 'leaferzeolith-premium-zeolith'
        when lower(raw_label) like '%kokos%' then 'leaferkokosfasertm-premium-kokosfasern'
        when lower(raw_label) like '%sphagnum%' then 'leafersphagnumtm-premium-sphagnum-moos'
        when lower(raw_label) like '%tongranulat%' then 'leafertongranulattm-premium-tongranulat'
        else null
      end as handle
    from raw_items
  ),
  enriched as (
    select
      m.raw_label,
      m.ordinality,
      p.handle,
      p.canonical_title,
      p.intro,
      p.primary_function,
      p.benefits,
      p.use_cases
    from mapped m
    left join public.storefront_product_content p on p.handle=m.handle
  )
  select coalesce(
    jsonb_agg(
      jsonb_strip_nulls(
        jsonb_build_object(
          'label', raw_label,
          'name', canonical_title,
          'intro', intro,
          'function', primary_function,
          'benefits', benefits,
          'use_cases', use_cases,
          'href', case when handle is not null then '/products/' || handle else null end
        )
      )
      order by ordinality
    ),
    '[]'::jsonb
  )
  from enriched
  where handle is not null and coalesce(intro,primary_function,'') <> '';
$function$;

revoke all on function public.build_ingredient_info(jsonb) from public, anon, authenticated;
grant execute on function public.build_ingredient_info(jsonb) to service_role;

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
        ('leafer','ingredient_info',
          case when public.build_ingredient_info(p.ingredients) <> '[]'::jsonb then public.build_ingredient_info(p.ingredients)::text end,
          case when public.build_ingredient_info(p.ingredients) <> '[]'::jsonb then public.build_ingredient_info(p.ingredients) end),
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
    select d.product_gid,d.namespace,d.key,d.raw_value,d.parsed_value,'supabase',
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

revoke all on function public.project_storefront_product_content_metafields(text) from public, anon, authenticated;
grant execute on function public.project_storefront_product_content_metafields(text) to service_role;

select public.project_storefront_product_content_metafields(null);
