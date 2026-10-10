-- Bundle-only rollout pilot. Idempotent recording of already approved SSOT intent.
-- IMPORTANT: requested_sales_mode is a planning field, not a checkout restriction.
-- No Shopify product/variant activation, inventory or pricing is changed.
WITH plan(handle, variant_title, bundle_slug, phase) AS (
  VALUES
    ('kokos-quelltabs','5','anzucht-mini-set','awaiting_bundle'),
    ('kokos-quelltabs','10','anzucht-starter-set','awaiting_checkout_enforcement'),
    ('anzuchtbecher-kompostierbar-fur-aussaat-jungpflanzen','5','anzucht-mini-set','awaiting_bundle'),
    ('anzuchtbecher-kompostierbar-fur-aussaat-jungpflanzen','10','anzucht-starter-set','awaiting_checkout_enforcement'),
    ('anzuchttopf-terrakotta-fur-aussaat-jungpflanzen','6,5 cm','anzucht-mini-set','awaiting_bundle'),
    ('rankhilfe-modular-schwarz','1','monstera-philodendron-rank-set','awaiting_choice_bundle_and_checkout_enforcement')
)
UPDATE core.product_variants v
SET data = jsonb_set(
  coalesce(v.data, '{}'::jsonb), '{merchandising}',
  coalesce(v.data->'merchandising', '{}'::jsonb) || jsonb_build_object(
    'requested_sales_mode','bundle_only',
    'rollout_status',plan.phase,
    'target_bundle_slug',plan.bundle_slug,
    'source','LEAFerservice_bundle_strategy_2026_10_11',
    'standalone_checkout_blocked',false,
    'do_not_change_shopify_variant_status',true,
    'activation_requires','bundle_mapping_and_storefront_checkout_validation'
  ), true),
 updated_at = now()
FROM core.products p, plan
WHERE v.product_id=p.id
 AND p.handle=plan.handle AND v.title=plan.variant_title
 AND coalesce(v.data#>>'{merchandising,standalone_checkout_blocked}','false') != 'true';

WITH pilot(slug,target_sets) AS (
 VALUES ('anzucht-starter-set',3),('anzucht-pro-set',1),
        ('aroid-umtopf-set',2),('efeutute-hange-set',2),
        ('sukkulenten-trio-set',1)
)
UPDATE public.product_bundles b SET
 merchandising=coalesce(b.merchandising,'{}'::jsonb) ||
 jsonb_build_object('pilot',jsonb_build_object(
   'campaign','bundle_only_pilot_2026_10',
   'target_sets',pilot.target_sets,'period_days',90,'started_on','2026-10-11',
   'not_a_stock_reservation',true,'component_costs_verified',false,
   'checkout_and_inventory_audit','pending','shopify_prices_preserved',true
 )),
 updated_at=now()
FROM pilot
WHERE b.slug=pilot.slug AND b.merchandising#>>'{pilot,checkout_and_inventory_audit}' IS DISTINCT FROM 'passed';

-- Supplier terms, real stock and sample are missing; never auto-publish.
INSERT INTO public.product_bundles
 (slug,title,purpose,description,bundle_type,discount_percent,status,shopify_sync_status,merchandising)
VALUES
 ('leaferservice-blumat-12-pflanzen-pilot',
  'LEAFer Bewässerungs-Komplettset – Blumat (Pilot)',
  'Geplante Komplettlösung zur sensorgesteuerten Bewässerung von bis zu zwölf Pflanzen',
  'Interner Beschaffungs- und Produkttest. Keine Verkaufsofferte; Händlerkonditionen, Original-Lieferumfang, Kompatibilität und Versand sind noch zu prüfen.',
  'fixed',0,'draft','blocked',
  jsonb_build_object(
   'intent','complete_solution','cross_sell',true,'source_product_asin','B008PXHY3A',
   'pilot',jsonb_build_object(
     'target_sets',1,'period_days',90,'started_on','2026-10-11',
     'physical_stock_reserved',false,'procurement_status','supplier_terms_missing',
     'checkout_status','not_published'),
   'publication_gates',jsonb_build_array(
     'supplier_authorization','cost_price','exact_sku','real_inventory',
     'shipping_fulfillment','product_images_rights','functional_sample_test')))
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.product_bundles
 (slug,title,purpose,description,bundle_type,discount_percent,status,shopify_sync_status,merchandising)
VALUES
 ('anzucht-mini-set','LEAFer Anzucht Mini-Set (Entwurf)',
  'Kompaktes Aussaat- und Umtopfset mit fünf Keimplätzen und fünf kleinen Töpfen',
  'Interne Idee: 2 L Seed & Cutting Mix, 5 Kokos-Quelltabs, 5 kompostierbare Anzuchtbecher und 5 Anzuchttöpfe 6,5 cm.',
  'fixed',0,'draft','blocked',
  jsonb_build_object(
    'intent','starter','cross_sell',true,'candidate_status','concept_not_published',
    'publication_gates',jsonb_build_array('component_costs','margin','stock_truth','photos_verified','checkout_rule'),
    'pilot',jsonb_build_object('target_sets',0,'not_a_stock_reservation',true,'rollout','after_initial_90_day_pilot')))
ON CONFLICT (slug) DO NOTHING;

-- Reserve no stock. Each line is an internal assembly requirement for ONE set.
WITH mini_components(position,product_handle,variant_title,units) AS (
 VALUES (1,'leafer-seed-cutting-mix','2 L',1::numeric),
        (2,'kokos-quelltabs','5',1::numeric),
        (3,'anzuchtbecher-kompostierbar-fur-aussaat-jungpflanzen','5',1::numeric),
        (4,'anzuchttopf-terrakotta-fur-aussaat-jungpflanzen','6,5 cm',5::numeric)
)
INSERT INTO public.product_bundle_components
 (bundle_id,position,role,shopify_product_gid,shopify_variant_gid,
  product_title,variant_title,quantity,unit_price_eur,metadata)
SELECT b.id,m.position,'required',p.shopify_product_gid,v.shopify_variant_gid,
       p.title,v.title,m.units,v.price,
       jsonb_build_object('source','core_product_variants','pricing_status','snapshot_unapproved','planned_only',true)
FROM mini_components m
JOIN core.products p ON p.handle=m.product_handle
JOIN core.product_variants v ON v.product_id=p.id AND v.title=m.variant_title
JOIN public.product_bundles b ON b.slug='anzucht-mini-set'
WHERE b.status='draft' AND b.shopify_sync_status='blocked'
 AND p.shopify_product_gid IS NOT NULL AND v.shopify_variant_gid IS NOT NULL
ON CONFLICT (bundle_id,position) DO NOTHING;

-- Add one cheap rank-support choice. The selection rules have not been released.
INSERT INTO public.product_bundle_components
 (bundle_id,position,role,shopify_product_gid,shopify_variant_gid,
 product_title,variant_title,quantity,unit_price_eur,selection_group,metadata)
SELECT b.id,5,'choice',p.shopify_product_gid,v.shopify_variant_gid,
       p.title,v.title,1,v.price,'rank_support',
       jsonb_build_object('source','core_product_variants','publication_status','bundle_pending',
          'choice_requires_validation',true)
FROM public.product_bundles b
JOIN core.products p ON p.handle='rankhilfe-modular-schwarz'
JOIN core.product_variants v ON v.product_id=p.id AND v.title='1'
WHERE b.slug='monstera-philodendron-rank-set'
 AND b.shopify_sync_status IN ('pending','blocked')
ON CONFLICT (bundle_id,position) DO NOTHING;

-- Avoid accidental publication of an unpriced selection-dependent bundle.
UPDATE public.product_bundles
SET shopify_sync_status='blocked',
    merchandising=coalesce(merchandising,'{}'::jsonb) ||
      jsonb_build_object('bundle_choice_change','added_modular_rankhilfe_1_piece',
      'publication_gate','validate_option_pricing_and_checkout_before_sync','pilot_status','pending_validation'),
    updated_at=now()
WHERE slug='monstera-philodendron-rank-set'
 AND status='ready' AND shopify_sync_status='pending';

-- Existing discounts disagree (discount_percent=10 but merchandising=5).
-- Record discrepancy; leave actual prices untouched.
UPDATE public.product_bundles
SET merchandising=jsonb_set(
  coalesce(merchandising,'{}'::jsonb),'{pilot,pricing_review}',
  CASE WHEN slug='sukkulenten-trio-set'
    THEN jsonb_build_object('status','needs_manual_reconciliation','supabase_price_eur',31.31,
      'shopify_observed_price_eur',34.99,'discount_column_pct',discount_percent,
      'merchandising_discount_pct',merchandising->>'discount_percent','cost_price_verified',false)
    ELSE jsonb_build_object('status','discount_field_conflict_and_costs_unverified',
      'discount_column_pct',discount_percent,
      'merchandising_discount_pct',merchandising->>'discount_percent','cost_price_verified',false)
  END,true),
  updated_at=now()
WHERE slug IN ('anzucht-starter-set','anzucht-pro-set','aroid-umtopf-set',
               'efeutute-hange-set','sukkulenten-trio-set')
AND coalesce(merchandising#>>'{pilot,pricing_review,cost_price_verified}','false')='false';
