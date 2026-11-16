# Validation

The Shopify theme lives in the repository root.

## Checks completed on 2026-10-18

- `node --test automation/codex/*.test.cjs tests/*.test.mjs`: 101 tests passed.
- `shopify theme check --path .` (CLI 4.4.0): 0 errors, 61 existing warnings.
- Repository/theme JSON and workflow YAML parsed successfully.
- Isolated PostgreSQL/PGlite checks covered verification/evidence gates, blocked
  updates, cancellation of pending queue entries, metadata-only reapproval and
  semantic JSON comparison.
- Liquid rendering checks covered canonical FAQ precedence, `q/a` compatibility,
  incomplete-entry fallback, duplicate suppression and visible/JSON-LD agreement.

Theme Check warnings remain in active compatibility code and existing templates.
They do not justify removing integrations that are still used. Public DE/EN link
verification and workflow expression validation also run in CI before merge.

## Release verification

After CI and review, merge the approved code and read back the production state.
The `live-storefront-verify.yml` workflow checks routes, storefront markers,
assistant responses, redirects and sitemap/internal links after native Shopify
sync. Metafield writes additionally require Shopify read-back and a matching
Supabase projection state; a successful code check alone does not verify content.
