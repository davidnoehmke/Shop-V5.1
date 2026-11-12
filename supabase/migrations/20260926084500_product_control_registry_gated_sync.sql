-- LEAFerservice product control loop: remove launch gates and gate Shopify writeback by registry.
-- Supabase remains SSOT; active/published Shopify products must never be downgraded automatically.

begin;

update public.shopify_metafield_registry
set sync_direction='none',
    required_for_publish=false,
    updated_at=now()
where owner_type='PRODUCT'
  and namespace='custom'
  and key in ('content_status','sync_status')
  and (
    sync_direction is distinct from 'none'
    or required_for_publish is distinct from false
  );

CREATE OR REPLACE FUNCTION public.evaluate_product_readiness(p_product_gid text)
 RETURNS product_readiness
 LANGUAGE plpgsql
 SET search_path TO 'public', 'shopify', 'pg_temp'
AS $function$
declare
  p shopify.products%rowtype;
  o public.product_observations%rowtype;
  prof text;
  blockers jsonb := '[]'::jsonb;
  warnings jsonb := '[]'::jsonb;
  missing jsonb := '[]'::jsonb;
  req_missing integer := 0;
  dirty_count integer := 0;
  v_min numeric;
  v_inventory integer;
  score numeric;
  bcount integer;
  wcount integer;
  status_out text;
  rec public.product_readiness%rowtype;
  desc_len integer;
  seo_title text;
  seo_desc text;
  content_status text;
  has_tag_hold boolean;
begin
  select * into p from shopify.products where shopify_gid=p_product_gid;
  if not found then raise exception 'Unknown Shopify product %',p_product_gid; end if;

  prof := coalesce(public.resolve_product_profile(p_product_gid),'standard');
  perform public.seed_required_metafield_state(p_product_gid);
  select * into o from public.product_observations where product_gid=p_product_gid;
  select min(price), sum(coalesce((payload->>'inventoryQuantity')::int,0))
    into v_min,v_inventory
  from shopify.variants where product_gid=p_product_gid;

  desc_len := length(regexp_replace(coalesce(p.payload->>'descriptionHtml',''),'<[^>]+>','','g'));
  seo_title := coalesce(p.payload#>>'{seo,title}','');
  seo_desc := coalesce(p.payload#>>'{seo,description}','');
  select raw_value into content_status
  from public.shopify_metafield_state
  where product_gid=p_product_gid and namespace='custom' and key='content_status';

  has_tag_hold := exists(
    select 1
    from jsonb_array_elements_text(coalesce(p.tags,'[]'::jsonb)) t(v)
    where lower(v)='verkaufsfreigabe ausstehend'
  );

  if length(trim(coalesce(p.title,'')))<3 then blockers:=blockers||jsonb_build_array(jsonb_build_object('rule','title_present','message','Titel fehlt')); end if;
  if length(trim(coalesce(p.handle,'')))<3 then blockers:=blockers||jsonb_build_array(jsonb_build_object('rule','handle_present','message','Handle fehlt')); end if;
  if length(trim(coalesce(p.vendor,'')))<2 then blockers:=blockers||jsonb_build_array(jsonb_build_object('rule','vendor_present','message','Anbieter fehlt')); end if;
  if length(trim(coalesce(p.product_type,'')))<2 then blockers:=blockers||jsonb_build_array(jsonb_build_object('rule','product_type_present','message','Produkttyp fehlt')); end if;
  if desc_len<250 then blockers:=blockers||jsonb_build_array(jsonb_build_object('rule','description_substantial','message','Produktbeschreibung zu kurz')); end if;
  if length(trim(seo_title))<20 then blockers:=blockers||jsonb_build_array(jsonb_build_object('rule','seo_title_present','message','SEO-Titel fehlt/zu kurz')); end if;
  if length(trim(seo_desc))<70 then blockers:=blockers||jsonb_build_array(jsonb_build_object('rule','seo_description_present','message','SEO-Beschreibung fehlt/zu kurz')); end if;

  if coalesce(o.media_count,0)<1 then blockers:=blockers||jsonb_build_array(jsonb_build_object('rule','media_present','message','Kein verifiziertes Produktmedium im Readiness-Snapshot')); end if;
  if coalesce(o.image_count,0)>0 and coalesce(o.image_alt_count,0)<coalesce(o.image_count,0) then warnings:=warnings||jsonb_build_array(jsonb_build_object('rule','image_alt_present','message','Nicht alle Produktbilder haben Alt-Text')); end if;
  if coalesce(o.min_price,v_min,0)<=0 then blockers:=blockers||jsonb_build_array(jsonb_build_object('rule','price_positive','message','Verkaufspreis ist 0 oder fehlt')); end if;

  if coalesce(o.tracks_inventory,(p.payload->>'tracksInventory')::boolean,true) then
    if coalesce(o.total_inventory,(p.payload->>'totalInventory')::int,v_inventory,0)<=0 and not coalesce(o.any_continue_selling,false) then
      blockers:=blockers||jsonb_build_array(jsonb_build_object('rule','inventory_sellable','message','Kein verkaufbarer Bestand und keine freigegebene Weiterverkaufsregel'));
    end if;
  end if;

  select count(*) into req_missing
  from public.shopify_metafield_registry r
  left join public.shopify_metafield_state s
    on s.product_gid=p_product_gid and s.namespace=r.namespace and s.key=r.key
  where r.owner_type='PRODUCT'
    and r.active
    and r.required_for_publish
    and (r.domain='all' or (r.domain='plant' and prof in ('living_plant','living_succulent')))
    and coalesce(s.validation_status,'missing')<>'valid';

  if req_missing>0 then
    blockers:=blockers||jsonb_build_array(jsonb_build_object('rule','required_metafields_valid','message',format('%s Pflicht-Metafelder fehlen oder sind nicht valide',req_missing)));
  end if;

  select count(*) into dirty_count
  from public.shopify_metafield_state s
  join public.shopify_metafield_registry r
    on r.owner_type='PRODUCT'
   and r.namespace=s.namespace
   and r.key=s.key
   and r.active
  where s.product_gid=p_product_gid
    and (s.dirty_for_shopify or s.dirty_for_supabase or s.validation_status='stale');

  if dirty_count>0 then
    blockers:=blockers||jsonb_build_array(jsonb_build_object('rule','sync_clean','message',format('%s Metafelder sind noch nicht sauber synchronisiert',dirty_count)));
  end if;

  if prof in ('living_plant','living_succulent') then
    if not coalesce(o.identity_confirmed,false) then blockers:=blockers||jsonb_build_array(jsonb_build_object('rule','identity_confirmed','message','Botanische Identität/Liefercharge nicht bestätigt')); end if;
    if not coalesce(o.supplier_confirmed,false) then blockers:=blockers||jsonb_build_array(jsonb_build_object('rule','supplier_confirmed','message','Lieferant/Bezugsquelle nicht bestätigt')); end if;
    if not coalesce(o.safety_reviewed,false) then blockers:=blockers||jsonb_build_array(jsonb_build_object('rule','safety_reviewed','message','Sicherheits-/Toxizitätsprüfung nicht bestätigt')); end if;
    if not coalesce(o.actual_product_image_confirmed,false) then warnings:=warnings||jsonb_build_array(jsonb_build_object('rule','actual_image_review','message','Echtes Lieferproduktbild noch nicht bestätigt')); end if;
  end if;

  bcount:=jsonb_array_length(blockers);
  wcount:=jsonb_array_length(warnings);
  score:=greatest(0,least(100,100-(bcount*12)-(wcount*3)));
  missing:=blockers;
  status_out:=case
    when upper(coalesce(p.status,''))='ACTIVE' and bcount=0 then 'published'
    when bcount=0 then 'publish_ready'
    when upper(coalesce(p.status,''))='DRAFT' then 'blocked'
    else 'needs_review'
  end;

  insert into public.product_readiness(
    product_gid,profile_code,readiness_status,quality_score,blocker_count,warning_count,
    blockers,warnings,missing_requirements,evaluation,source_updated_at,last_evaluated_at,
    system_version,updated_at
  )
  values(
    p_product_gid,prof,status_out,score,bcount,wcount,blockers,warnings,missing,
    jsonb_build_object(
      'description_length',desc_len,
      'required_metafields_invalid',req_missing,
      'dirty_metafields',dirty_count,
      'min_price',coalesce(o.min_price,v_min),
      'inventory',coalesce(o.total_inventory,(p.payload->>'totalInventory')::int,v_inventory),
      'release_hold_tag_observed',has_tag_hold,
      'content_status_observed',content_status
    ),
    p.shopify_updated_at,now(),'readiness-v1.3-no-launch-gates',now()
  )
  on conflict(product_gid) do update set
    profile_code=excluded.profile_code,
    readiness_status=excluded.readiness_status,
    quality_score=excluded.quality_score,
    blocker_count=excluded.blocker_count,
    warning_count=excluded.warning_count,
    blockers=excluded.blockers,
    warnings=excluded.warnings,
    missing_requirements=excluded.missing_requirements,
    evaluation=excluded.evaluation,
    source_updated_at=excluded.source_updated_at,
    last_evaluated_at=excluded.last_evaluated_at,
    system_version=excluded.system_version,
    updated_at=now()
  returning * into rec;

  return rec;
end;
$function$


CREATE OR REPLACE FUNCTION public.trg_queue_dirty_metafield()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  can_write boolean := false;
begin
  select exists (
    select 1
    from public.shopify_metafield_registry r
    where r.owner_type='PRODUCT'
      and r.namespace=new.namespace
      and r.key=new.key
      and r.active
      and r.source_of_truth='supabase'
      and r.sync_direction in ('to_shopify','bidirectional')
  ) into can_write;

  if new.dirty_for_shopify then
    if can_write and new.validation_status='valid' then
      perform public.enqueue_product_sync(
        new.product_gid,
        'metafields_upsert',
        jsonb_build_object('namespace',new.namespace,'key',new.key),
        85,
        new.product_gid || ':metafield:' || new.namespace || ':' || new.key || ':' || new.updated_at::text
      );
    elsif not can_write then
      update public.shopify_metafield_state
         set dirty_for_shopify=false,
             updated_at=now()
       where id=new.id
         and dirty_for_shopify=true;
    end if;
  end if;

  return new;
end;
$function$


-- Clear stale internal workflow drift and obsolete queued writes.
update public.shopify_metafield_state s
set dirty_for_shopify=false,
    updated_at=now()
from public.shopify_metafield_registry r
where r.owner_type='PRODUCT'
  and r.namespace=s.namespace
  and r.key=s.key
  and r.active
  and r.sync_direction='none'
  and s.dirty_for_shopify=true;

update public.product_sync_queue q
set status='cancelled',
    last_error='Automatic Shopify writeback disabled by canonical metafield registry.',
    updated_at=now()
where q.status='queued'
  and q.operation='metafields_upsert'
  and exists (
    select 1
    from public.shopify_metafield_registry r
    where r.owner_type='PRODUCT'
      and r.namespace=q.payload->>'namespace'
      and r.key=q.payload->>'key'
      and r.active
      and r.sync_direction='none'
  );

commit;
