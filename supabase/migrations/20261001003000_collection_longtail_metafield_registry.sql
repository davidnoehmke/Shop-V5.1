insert into public.shopify_metafield_registry
(
  owner_type,
  namespace,
  key,
  name,
  data_type,
  domain,
  dynamic_role,
  source_of_truth,
  sync_direction,
  required_for_publish,
  storefront_visible,
  validation_rules,
  description,
  active
)
values
(
  'COLLECTION',
  'leafer',
  'longtail_keywords',
  'Longtail Keywords',
  'list.single_line_text_field',
  'seo',
  'seo',
  'supabase',
  'to_shopify',
  false,
  false,
  '{"max_items":24,"presentation":{"surface":[],"component":"hidden"}}'::jsonb,
  'Interne priorisierte Longtail-Cluster fuer Collection-SEO. Nicht im Storefront-Theme ausgeben.',
  true
)
on conflict (owner_type, namespace, key) do update set
  name = excluded.name,
  data_type = excluded.data_type,
  domain = excluded.domain,
  dynamic_role = excluded.dynamic_role,
  source_of_truth = excluded.source_of_truth,
  sync_direction = excluded.sync_direction,
  required_for_publish = excluded.required_for_publish,
  storefront_visible = excluded.storefront_visible,
  validation_rules = excluded.validation_rules,
  description = excluded.description,
  active = excluded.active,
  updated_at = now();
