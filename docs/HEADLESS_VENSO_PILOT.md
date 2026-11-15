# Venso Hydrogen / Oxygen pilot

Owner request: prepare a Venso brand page, real product/variant/cart flow and
Shopify checkout handoff in an Oxygen preview. No production domain cutover.

## Source ownership

- Canonical code and release gate: `davidnoehmke/Shop-V5.1`.
- `headless/` imports the existing Hydrogen application from `davidnoehmke/leaferpage`
  commit `3237709d44352c875e8caa14c2b5aad614ae0ab0`; the historical repository is not
  a second production writer. The upstream GPL license is retained in `headless/LICENSE`.
- Supabase remains the canonical editable source of product/content/configurator data.
- The pilot reads published Shopify projections through the Storefront API; it does
  not create, overwrite, draft or unpublish products, variants, prices or metafields.
- Product paths remain `/products/:handle`. Numeric `?variant=` links resolve the
  original Shopify variant and verify that it belongs to the requested product.

## Scope and deliberate version boundary

Reuse the pinned Hydrogen 2026.4.4 / React Router 7.16.0 application for this
pilot. A migration to Hydrogen 2026-10 changes the commerce integration APIs and
is a separate task after this baseline is verified. Do not mix both API families.

New page: `/marken/venso`; its product cards read the public vendor projection
`Venso EcoSolutions GmbH`, product handles, images, prices and `leafer.short_claim`.
No supplier approvals, costs, procurement notes or fabricated stock data are embedded.

Reference product, verified from the public Shopify product endpoint on 2026-10-22:

- Handle: `venso-grow-light-winter-e27-pflanzenlampe-7w-15w`
- Product ID: `15551852085633`
- 7 W variant: `56340095992193`
- 15 W variant: `56340096024961`

These are verification references, not a duplicate editable catalog. E2E compares
against the current public product response instead of fixing prices in code.

## Existing code issues addressed

- Removed a stale generated fragment reference that failed the inherited typecheck.
- Regenerated GraphQL types, including the existing collection description field.
- Product add buttons stay disabled while pending; the drawer opens after success.
- Cart errors are visible rather than reporting an unconfirmed add as success.
- Cart redirect targets are restricted to local paths.
- German purchase/cart labels and the Helvetica font stack match the current shop.
- Shopify consent banner enabled; no private environment values returned to the browser.
- Pilot responses are explicitly noindex. Search indexing needs a separate launch task.

## Preview configuration

The existing LEAFerservice Hydrogen storefront must be linked for deployment from
this canonical repository, with a server-side `OXYGEN_DEPLOYMENT_TOKEN` GitHub secret.
Use the existing storefront rather than creating a second commerce catalog.

Verify its Preview environment has `SESSION_SECRET`, the real store domain,
Storefront API credentials, checkout domain, Storefront ID and Customer Account
configuration expected by the imported application. `.env.example` has names only.
Publish the intended products to that storefront channel only after checking current
publication state. Never remove them from existing channels.

`.github/workflows/headless-pilot.yml` builds/tests every relevant PR and deploys
only pushes to `pilot/venso-hydrogen-oxygen`, using `hydrogen deploy --preview`.
It never deploys to Production, changes domains or silently passes when the
Oxygen token is missing. Missing configuration is reported as a failed preview job.
The historical duplicate Oxygen workflows are deliberately not activated here.
`headless/` is excluded from Shopify theme delivery by `.shopifyignore`.

## Verification

From `headless/`: `npm ci`, `npm run codegen`, `npm run typecheck`, `npm run lint`,
`npm test`, `npm run build`, `npm run check:build`.

After deployment: run `PILOT_BASE_URL=<verified preview origin> npm run test:e2e`.
Desktop and mobile tests use the real Venso product, check original product and
variant IDs, load both variant links and their current prices, change options,
add to a new browser-session cart, reach Shopify checkout, then remove the test
item. No customer data is entered, no payment is made, and no order is submitted.
Screenshots and the safe preview URL are retained as CI artifacts. Deployment logs
containing runtime configuration or authentication tokens are not uploaded.

A preview blocked by access controls or missing credentials is not a passed
commerce test. Complete read-back verification before calling the pilot accepted.

## Controller post-check

Independently review the PR, verify no product/catalog mutations, inspect the
preview run and mobile/desktop evidence, and check existing product/variant links,
cart errors, checkout handoff, privacy consent and source/credential boundaries.
A production release, domain switch and removal of pilot noindex require a separate
reviewed change after the preview is accepted.
