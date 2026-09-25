-- Keep the fachliche SSOT in Supabase while requiring GitHub PR/CI/merge
-- for storefront structure and theme/code changes.

update public.commerce_ssot_policy
set
  projection_systems = '["github","shopify"]'::jsonb,
  conflict_policy = 'github_pr_ci_merge_required_for_storefront_structure; freeze_except_verified_bug_or_search_analytics_evidence_with_explicit_owner_approval',
  updated_at = now()
where entity_type = 'storefront_structure';

update ops.automations
set
  description = 'Spiegelt freigegebene Supabase-Katalog- und Contentänderungen nach Shopify. Theme-/Codeänderungen laufen separat zwingend über GitHub PR -> CI -> Merge -> Shopify.',
  config = config
    || '{"scope":"catalog_content_only","code_changes":false,"theme_deploy_via":"github_pr_ci_merge"}'::jsonb,
  updated_at = now()
where slug = 'supabase-shopify-projection-sync';
