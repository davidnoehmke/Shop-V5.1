-- Expand the read-only Admin Hub snapshot with complete product-card data.
-- The token gate and function privileges remain unchanged.

create or replace function private.admin_panel_snapshot(p_token text, p_limit integer default 250)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 250), 25), 500);
begin
  if p_token is null or not exists (
    select 1 from private.changelog_read_tokens t
    where t.token_name = 'admin_app'
      and t.token_hash = extensions.digest(p_token, 'sha256')
  ) then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'summary', jsonb_build_object(
      'products_total', (select count(*) from core.products),
      'variants_total', (select count(*) from core.product_variants),
      'articles_total', (select count(*) from public.content_articles),
      'articles_published', (select count(*) from public.content_articles where status = 'published'),
      'approvals_pending', (select count(*) from public.content_approval_queue where status = 'pending_review'),
      'visual_pending', (select count(*) from public.visual_asset_jobs where status in ('queued','processing','pending_review','approved','sync_ready')),
      'product_sync_queued', (select count(*) from public.product_sync_queue where status in ('queued','processing')),
      'product_sync_failed', (select count(*) from public.product_sync_queue where status = 'failed'),
      'automations_enabled', (select count(*) from ops.automations where enabled),
      'agent_failures_24h', (select count(*) from ops.agent_runs where status = 'failed' and started_at >= now() - interval '24 hours'),
      'sync_conflicts_open', (select count(*) from sync.conflicts where resolution_status = 'open'),
      'code_reviews_open', (select count(*) from public.code_review_runs where status in ('started','needs_review')),
      'generated_at', now()
    ),
    'products', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select p.id, p.title, p.handle, p.product_type, p.vendor, p.status,
             p.description_html, p.short_description, p.canonical_source,
             p.canonical_version, p.shopify_product_gid, p.shopify_product_id,
             p.notion_page_id, p.data, p.updated_at,
             coalesce((select count(*) from core.product_variants v where v.product_id = p.id), 0)::int as variant_count,
             (select min(v.price) from core.product_variants v where v.product_id = p.id) as min_price,
             (select max(v.price) from core.product_variants v where v.product_id = p.id) as max_price,
             coalesce((select jsonb_agg(to_jsonb(vx) order by vx.title, vx.sku) from (
               select v.id, v.title, v.sku, v.option_values, v.price, v.compare_at_price,
                      v.cost_price, v.currency, v.weight_value, v.weight_unit,
                      v.requires_shipping, v.taxable, v.track_inventory, v.status,
                      v.shopify_variant_gid, v.shopify_variant_id, v.shopify_inventory_item_gid,
                      v.data, v.updated_at,
                      coalesce((select jsonb_agg(to_jsonb(i) order by i.updated_at desc)
                                from core.variant_inventory i where i.variant_id = v.id), '[]'::jsonb) as inventory,
                      coalesce((select jsonb_agg(to_jsonb(m) order by m.namespace, m.key)
                                from core.metafields m where m.variant_id = v.id), '[]'::jsonb) as metafields
               from core.product_variants v where v.product_id = p.id
             ) vx), '[]'::jsonb) as variants,
             coalesce((select jsonb_agg(to_jsonb(m) order by m.namespace, m.key)
                       from core.metafields m where m.product_id = p.id), '[]'::jsonb) as metafields,
             coalesce((select jsonb_agg(to_jsonb(a) order by a.position, a.created_at)
                       from core.media_assets a where a.product_id = p.id), '[]'::jsonb) as media,
             coalesce((select jsonb_agg(to_jsonb(l) order by l.locale)
                       from core.product_localizations l where l.product_id = p.id), '[]'::jsonb) as localizations,
             coalesce((select jsonb_agg(to_jsonb(u) order by u.position)
                       from core.product_usps u where u.product_id = p.id), '[]'::jsonb) as usps,
             coalesce((select jsonb_agg(to_jsonb(f) order by f.position)
                       from core.product_faqs f where f.product_id = p.id), '[]'::jsonb) as faqs,
             coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'title', c.title, 'handle', c.handle, 'position', pc.position)
                                         order by pc.position, c.title)
                       from core.product_collections pc join core.collections c on c.id = pc.collection_id
                       where pc.product_id = p.id), '[]'::jsonb) as collections,
             coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'relation_type', r.relation_type,
                         'label', r.label, 'position', r.position, 'active', r.active,
                         'product_id', rp.id, 'title', rp.title, 'handle', rp.handle)
                         order by r.position, rp.title)
                       from core.product_cross_sells r join core.products rp on rp.id = r.recommended_product_id
                       where r.product_id = p.id), '[]'::jsonb) as cross_sells
      from core.products p
      order by p.updated_at desc
      limit v_limit
    ) x), '[]'::jsonb),
    'articles', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select a.id, a.title, a.handle, a.status, a.primary_keyword, a.search_intent,
             a.quality_score, a.published_at, a.updated_at, a.shopify_article_gid,
             a.ux_schema #>> '{hero_image,shopify_url}' as hero_image_url,
             a.ux_schema #>> '{hero_image,alt_text}' as hero_image_alt,
             a.ux_schema #>> '{hero_image,provider}' as hero_image_provider
      from public.content_articles a order by a.updated_at desc limit v_limit
    ) x), '[]'::jsonb),
    'topics', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select t.id, t.topic, t.primary_keyword, t.search_intent, t.demand_score,
             t.relevance_score, t.competition_score, t.freshness_score,
             t.opportunity_score, t.status, t.researched_at
      from public.content_topics t order by t.opportunity_score desc nulls last, t.researched_at desc limit v_limit
    ) x), '[]'::jsonb),
    'approvals', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select q.id, q.candidate_type, a.title as article_title, a.handle as article_handle,
             q.status, q.target_system, q.target_repository, q.reviewed_by,
             q.reviewed_at, q.approval_note, q.updated_at
      from public.content_approval_queue q left join public.content_articles a on a.id = q.article_id
      order by q.updated_at desc limit v_limit
    ) x), '[]'::jsonb),
    'visuals', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select j.id, j.resource_type, j.resource_title, j.resource_ref, j.asset_role,
             j.operation, j.status, j.priority, j.reviewed_at, j.synced_at, j.last_error, j.updated_at
      from public.visual_asset_jobs j order by j.priority desc, j.updated_at desc limit v_limit
    ) x), '[]'::jsonb),
    'automations', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select a.id, a.slug, a.name, a.description, a.trigger_type, a.schedule,
             a.enabled, a.last_run_at, a.updated_at
      from ops.automations a order by a.enabled desc, a.name limit v_limit
    ) x), '[]'::jsonb),
    'agent_runs', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select r.id, r.agent_name, r.status, r.started_at, r.finished_at,
             r.error_message, a.slug as automation_slug, a.name as automation_name
      from ops.agent_runs r left join ops.automations a on a.id = r.automation_id
      order by r.started_at desc limit least(v_limit, 100)
    ) x), '[]'::jsonb),
    'sync_state', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select integration, cursor, last_success_at, last_error, updated_at
      from public.sync_state order by integration
    ) x), '[]'::jsonb),
    'sync_runs', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select id, pipeline, direction, status, started_at, finished_at,
             records_read, records_written, records_failed, error_summary
      from sync.runs order by started_at desc limit least(v_limit, 100)
    ) x), '[]'::jsonb),
    'connections', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select id, provider, display_name, status, last_checked_at, updated_at
      from sync.connections order by provider
    ) x), '[]'::jsonb),
    'product_sync_queue', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select id, product_gid, operation, status, priority, attempts, last_error,
             available_at, created_at, updated_at
      from public.product_sync_queue
      order by case when status = 'failed' then 0 when status = 'processing' then 1 else 2 end,
               priority desc, updated_at desc limit v_limit
    ) x), '[]'::jsonb),
    'code_reviews', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select id, source_system, repository, ref, commit_sha, status, summary, created_at, completed_at
      from public.code_review_runs order by created_at desc limit least(v_limit, 100)
    ) x), '[]'::jsonb),
    'ai_launchers', coalesce((select jsonb_agg(to_jsonb(x)) from (
      select id, slug, label, description, group_name, launch_type, target,
             sort_order, enabled, updated_at
      from public.admin_ai_launchers where enabled order by sort_order, label limit v_limit
    ) x), '[]'::jsonb)
  );
end;
$$;

revoke all on function private.admin_panel_snapshot(text, integer) from public;
grant execute on function private.admin_panel_snapshot(text, integer) to anon, authenticated, service_role;
