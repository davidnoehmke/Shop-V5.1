# LEAFerservice automated Shopify delivery

## Purpose

The repository is the versioned theme source. A single permanent unpublished Shopify theme is used as staging. New theme copies are not created for routine deployments.

## Automated flow

1. A change reaches `main`.
2. `LEAF CI` validates repository JSON, the agent contract, secrets, Shopify Theme Check, theme structure and Supabase migration invariants.
3. Only a successful `LEAF CI` run on `main` triggers `Shopify Staging Delivery`.
4. The delivery workflow resolves the fixed staging theme ID from the GitHub Environment variable `SHOPIFY_STAGING_THEME_ID`.
5. Theme Check is executed again immediately before delivery.
6. Shopify CLI pushes `theme/` into the same permanent unpublished staging theme.
7. Deployment result, commit SHA, workflow run, target theme, duration, changed-file count and machine-readable analysis are recorded in Supabase `ops.deployments`.
8. GitHub Actions writes a human-readable deployment summary for every run.
9. Production publication is deliberately separate from staging delivery.

## Required GitHub Environment configuration

Environment: `shopify-preview`

Variable:
- `SHOPIFY_STAGING_THEME_ID`: numeric ID of the permanent unpublished Shopify staging theme.

Secrets:
- `SHOPIFY_STORE`: Shopify store hostname.
- `SHOPIFY_CLI_THEME_TOKEN`: Shopify Theme Access/CLI credential with only the required theme permissions.
- `SUPABASE_URL`: project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: server-side credential used only by GitHub Actions to write operational telemetry. Never expose it to theme code or browsers.

## Observability

Canonical deployment telemetry is stored in `ops.deployments`. The `ops.deployment_health` view provides rolling seven-day deployment counts, successes, failures, average successful deployment duration and last successful deployment time.

The table is backend-only: RLS is enabled, public/anon/authenticated access is revoked, and `service_role` has SELECT/INSERT/UPDATE but not DELETE/TRUNCATE.

## Failure model

A failed CI run never deploys. A failed pre-deploy Theme Check never deploys. Missing credentials or missing staging ID fail closed. A failed Shopify push is recorded as failed when telemetry credentials are available. Production is never automatically published by this workflow.

## Rollback

Use Git history as the source of truth: revert or restore the desired commit, allow CI to validate it, then let the same staging delivery pipeline deploy the restored state. Production promotion remains a separate approval step.
