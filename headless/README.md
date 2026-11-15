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

## Supabase portal authentication

The headless app now has server-rendered `/auth/login`, POST-only `/auth/logout`,
and a protected `/portal` landing page. Use `?lang=en` for English UI. Shopify's
`/account/*` continues to manage Shopify orders, addresses and customer profiles.
A Supabase session does not grant Shopify account access.

Set these server runtime variables in the intended Preview environment before
building/deploying the branch:

- `SUPABASE_URL=https://vbqimcwaxcydegqlkkgw.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY`: the enabled **default publishable key** from the
  project's API Keys page. Never use a secret or `service_role` key.

Missing variables return HTTP 503 on the new authentication routes. Guest
shopping remains available without these variables. No secrets are serialized
into loader data or browser bundles. The integration uses email/password sign-in
with existing Supabase Auth users; it does not send invitation emails or add a
registration/password-recovery flow. Provision portal users through the existing
Supabase Auth administration process. Password login requires no callback URL.

`requirePortalUser(request, context.env)` verifies the user through Supabase Auth
on every protected loader/action and rejects anonymous Auth users. Every ordinary
verified Supabase user can access this initial portal, which displays only their
own email and a sign-out button. This is not an administrative authorization role.
Do not add operational/CRM/shop data to it without defining authorization and RLS.

For future protected routes, invoke this helper in **each loader and action**;
React Router parent and child loaders run in parallel. Preserve its returned
headers on data, redirect and error responses so rotated/cleared cookies survive.
Never trust a cookie's embedded user or `user_metadata` for authorization. Use a
user-scoped Supabase client with ownership-based RLS for private database data.
No database grants or existing RLS policies were changed by this implementation.

Sessions use request-scoped clients, HttpOnly cookies, SameSite=Lax, Secure on
HTTPS, and no-store response headers. Login/logout require same-origin POSTs;
login redirects accept only local `/portal` paths. Authentication cookies append
to Hydrogen's existing session cookies. Logout ends the local Supabase session;
other devices and already issued access tokens retain Supabase's normal lifetimes.

Validation: the test suite covers anonymous navigation, forged-cookie rejection,
verified/anonymous Auth users, refresh-cookie propagation, logout, CSRF,
redirect sanitization and missing configuration. Typecheck/build are separate
from a real login test. Before release, verify login with an existing account,
reload `/portal`, inspect cookie flags and no-store headers, sign out, and confirm
direct navigation redirects again. Also confirm Shopify customer login and guest
cart still work in the configured Preview. Do not mark these browser checks
complete based only on mocked Auth tests or a build.

Connected-project read-only check (2026-11-15): Auth settings returned HTTP 200,
email authentication enabled, signups enabled and email confirmation required.
No test accounts were created. Security advisors returned informational notices
for 58 RLS-enabled tables without policies; no broad access policies were added.
See the [Supabase explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

References: [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[Hydrogen account routing examples](https://shopify.dev/docs/storefronts/headless/legacy/hydrogen/cookbook/legacy-customer-account-flow).
