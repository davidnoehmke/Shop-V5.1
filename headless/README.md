# LEAFerservice Hydrogen pilot

Canonical implementation: `davidnoehmke/Shop-V5.1/headless`.

See `../docs/HEADLESS_VENSO_PILOT.md` for provenance, architecture, preview
configuration and verification. This pilot does not replace the live theme.

```sh
npm ci
npm run codegen
npm run typecheck
npm run lint
npm test
npm run build
npm run check:build
```

Open `/marken/venso` in a configured Hydrogen/Oxygen preview. Product, variant,
price and cart data come from the real Shopify Storefront API projection.

## Vercel Preview

Use project `leaferservice-6-preview` in team `leafer1`, root `headless`,
React Router framework and Node 24. `headless/vercel.json` declares `npm ci`
and the environment preflight followed by the Vercel build. Keep Mini Oxygen
disabled only in Vercel builds: its worker export is incompatible with Vercel's
React Router Node adapter. `npm run check:vercel` invokes the emitted Fetch
handler; it uses dummy configuration and proves no live commerce behavior.

Set values securely in **Preview**, without committing a populated `.env` file.
Environment edits apply to new deployments; an older READY deployment retains
its old environment. Redeploy the exact reviewed commit, and verify its SHA and
Preview target before testing. Never promote it or assign the live shop domain
as part of Preview setup.

| Variable | Requirement in Hydrogen 2026.4.4 |
| --- | --- |
| `SESSION_SECRET` | Required to sign sessions. Generate at least 32 random bytes; store as a Vercel Secret. Keep Preview and Production secrets separate. |
| `PUBLIC_STORE_DOMAIN` | Required: verified Shopify store hostname, without scheme or path. |
| `PUBLIC_STOREFRONT_API_TOKEN` | Required by this app's Storefront/consent integration. Use the existing intended Storefront channel, with the required product and cart access. It is deliberately public, never an Admin API token. |
| `PUBLIC_CHECKOUT_DOMAIN` | Required by this app's consent/CSP integration: verified Shopify checkout hostname. It does not replace the Shopify API's authoritative `cart.checkoutUrl`. |
| `PRIVATE_STOREFRONT_API_TOKEN` | Optional server-only Storefront credential. Hydrogen prefers it when supplied. Never expose it to the client. |
| `PUBLIC_STOREFRONT_ID` | Optional channel attribution for Hydrogen analytics; not a prerequisite for guest checkout. |
| `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID`, `SHOP_ID` | Both needed for Customer Account login. Register the exact Preview origin and `/account/authorize` callback with the existing Shopify Customer Account client. Guest shopping does not require login. |

`PUBLIC_CUSTOMER_ACCOUNT_API_URL` belongs to an older configuration shape. This
installed Hydrogen version derives account endpoints from `SHOP_ID` and does
not consume that variable. Nuxt-prefixed Shopify variables and Supabase values
do not substitute for Hydrogen Storefront configuration.

Run `npm run check:env` inside the configured deployment environment. It reports
only variable names and rejects missing required values and common placeholders;
it cannot prove credential validity, channel publication, callback registration
or live checkout functionality. Do not pull Production secrets to run local QA.

Acceptance requires actual HTTP 200 and hydrated pages at `/`, `/en`,
`/products/leafer-substrat-konfigurator`,
`/en/products/leafer-substrat-konfigurator`, `/cart` and `/en/cart`. In a new
browser cart, select four components, change a share, verify all shares stay
non-negative and sum to 100%, add the mix, reload and verify its recipe line
attributes. Open the Shopify-returned checkout URL and confirm the test line
and recipe survive. Remove only QA-created lines afterward; submit no order.
Check desktop and mobile layouts, locale continuity and error states separately.
No production merge or domain switch is justified by a build-only smoke test.

## Integrated release candidate, 2026-10-31

`release/headless-cutover-20261031` combines the brand/article release candidate,
Room Studio, the English route fixes and the intent-led DE/EN homepage. It fixes
the shared-loader client build, room-plan import types, scene colors, mobile
overflow, offscreen room-editor controls, recipe price hydration, the broken
lighting collection link and the unconfigured customer-account entry. Without
an embedded Customer Account client, account entry redirects to the shop's
verified existing `account.leaferservice.com` login.

Local verification uses the emitted Vercel handler, real public Storefront
configuration and a newly generated local signing key. It does not pull
Production secrets. The release browser suite covers DE/EN entry destinations,
375/1440px layouts, hydration errors, hosted account entry, plant placement and
undo, four-part recipe balance, cart persistence, and checkout recipe retention.
Every test cart is isolated; only QA-created lines are removed; no order is placed.

```sh
PILOT_BASE_URL=https://<exact-reviewed-deployment> npm run test:e2e -- e2e/headless-release.spec.ts
```

For a protected preview, set `VERCEL_QA_AUTH_FILE` to an uncommitted temporary JSON
file with `origin` and a short-lived `secret`. The fixture scopes its header to
that exact origin. Never save access files, browser state or tokens in the repo.

**Cutover remains blocked.** A real cart currently returns
`https://leaferservice.com/cart/c/...`, and checkout stays on that hostname.
Moving its DNS to Vercel before separating checkout would break purchases.
First connect a Shopify-managed checkout subdomain, target **Online Store**, and
set its domain type to **Primary**, following the
[Shopify migration guide](https://shopify.dev/docs/storefronts/headless/legacy/hydrogen/migrate).
Update `PUBLIC_CHECKOUT_DOMAIN` only after verifying that host and confirm the
actual Shopify-returned cart URL uses it. Changing that environment variable
alone does not change Shopify checkout routing. Run the final gate:

```sh
REQUIRE_HEADLESS_CHECKOUT=1 PILOT_BASE_URL=https://<staged-production-deployment> npm run test:e2e -- e2e/headless-release.spec.ts
```

The Shopify connector has no DNS/domain mutation capability. Apex and `www`
still resolve to Shopify; Vercel reports both externally managed and
misconfigured despite their ownership verification. Domain changes therefore
require Shopify domain administration. Preserve the `account` and checkout
subdomains, mail records and the Liquid rollback. Before DNS changes, finish the
staged production/rollback and indexing gates in `docs/HEADLESS_ENTERPRISE_MIGRATION.md`.
The live sitemap contains 925 URLs; this turn verified the entry and footer
destinations, not the full sitemap. Existing route-level noindex policies are
retained pending that audit. English Room Studio parity and the complete
production acceptance criteria are not established by the core browser suite.
