-- Only verified, evidenced canonical content may enter the outbound projection.
-- Preserve existing published data and hold pending content that lacks verification.
begin;

CREATE OR REPLACE FUNCTION public.project_storefront_product_content_metafields(p_product_gid text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  affected integer := 0;
begin
  update public.shopify_metafield_state s
  set validation_status = 'invalid',
      validation_errors = '["canonical_content_not_verified_or_blocked"]'::jsonb,
      dirty_for_shopify = false,
      updated_at = now()
  from public.storefront_product_content p
  where p.product_gid = s.product_gid
    and (p_product_gid is null or p.product_gid = p_product_gid)
    and s.source_system = 'supabase'
    and s.dirty_for_shopify
    and (s.namespace, s.key) in (
      ('custom','faq'), ('leafer','intro'), ('leafer','subtitle'),
      ('leafer','primary_function'), ('leafer','suitable_for'),
      ('leafer','usp_1'), ('leafer','usp_2'), ('leafer','usp_3'),
      ('leafer','application_steps'), ('leafer','ingredients'),
      ('leafer','ingredient_info'), ('leafer','mixing_ratio'),
      ('leafer','primary_search_term'), ('leafer','search_terms')
    )
    and (
      p.verified_at is null
      or not exists (
        select 1
        from jsonb_array_elements(
          case when jsonb_typeof(p.evidence) = 'array' then p.evidence else '[]'::jsonb end
        ) e(value)
        where jsonb_typeof(e.value) = 'object' and e.value <> '{}'::jsonb
      )
      or coalesce(p.storefront_schema->>'publication_blocked', 'false') = 'true'
    );

  update public.product_sync_queue q
  set status = 'cancelled',
      last_error = 'canonical_content_not_verified_or_blocked',
      updated_at = now()
  from public.shopify_metafield_state s
  where q.product_gid = s.product_gid
    and (p_product_gid is null or q.product_gid = p_product_gid)
    and q.operation = 'metafields_upsert'
    and q.status = 'queued'
    and q.payload->>'namespace' = s.namespace
    and q.payload->>'key' = s.key
    and s.validation_status = 'invalid'
    and s.validation_errors ? 'canonical_content_not_verified_or_blocked';

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
          case
            when public.build_ingredient_info(p.ingredients) <> '[]'::jsonb
            then public.build_ingredient_info(p.ingredients)::text
          end,
          case
            when public.build_ingredient_info(p.ingredients) <> '[]'::jsonb
            then public.build_ingredient_info(p.ingredients)
          end),
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
      and p.verified_at is not null
      and exists (
        select 1
        from jsonb_array_elements(
          case when jsonb_typeof(p.evidence) = 'array' then p.evidence else '[]'::jsonb end
        ) e(value)
        where jsonb_typeof(e.value) = 'object' and e.value <> '{}'::jsonb
      )
      and coalesce(p.storefront_schema->>'publication_blocked', 'false') <> 'true'
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
        or public.shopify_metafield_state.parsed_value is distinct from excluded.parsed_value
        or public.shopify_metafield_state.validation_status is distinct from 'valid'
      ),
      dirty_for_supabase=false,
      updated_at=now()
    where public.shopify_metafield_state.parsed_value is distinct from excluded.parsed_value
       or public.shopify_metafield_state.source_system is distinct from 'supabase'
       or public.shopify_metafield_state.validation_status is distinct from 'valid'
       or public.shopify_metafield_state.validation_errors is distinct from '[]'::jsonb
       or public.shopify_metafield_state.dirty_for_supabase
    returning 1
  )
  select count(*) into affected from upserted;
  return affected;
end;
$function$
;

drop trigger if exists project_storefront_product_content_metafields
  on public.storefront_product_content;
create trigger project_storefront_product_content_metafields
after insert or update of
  subtitle,intro,primary_function,ingredients,mixing_ratio,application_steps,
  benefits,use_cases,faq,primary_search_term,search_terms,
  verified_at,evidence,storefront_schema
on public.storefront_product_content
for each row execute function public.trg_project_storefront_product_content();

select public.project_storefront_product_content_metafields(null);

commit;
