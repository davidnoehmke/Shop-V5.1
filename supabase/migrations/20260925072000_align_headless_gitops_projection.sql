-- Keep the fachliche SSOT in Supabase while requiring GitHub PR/CI/merge
-- for storefront structure and theme/code changes.

update public.commerce_ssot_policy
set
  projection_systems = '["shopify","custom_storefront"]'::jsonb,
  conflict_policy = 'github_code_wins; supabase_supplies_content_and_presentation_contract; shopify_is_current_deployment_target; no_unreviewed_theme_editor_drift',
  updated_at = now()
where entity_type = 'storefront_structure';

update ops.automations
set
  description = 'Spiegelt freigegebene Supabase-Katalog- und Contentänderungen nach Shopify. Theme-/Codeänderungen laufen separat zwingend über GitHub PR -> CI -> Merge -> Shopify.',
  config = config
    || '{"scope":"catalog_content_only","code_changes":false,"theme_deploy_via":"github_pr_ci_merge"}'::jsonb,
  updated_at = now()
where slug = 'supabase-shopify-projection-sync';
