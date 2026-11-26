# LEAFerservice Grow Calendar

Nuxt 4 / Vue 3 / strict TypeScript app. Supabase is the editable crop source;
Shopify remains the commerce destination. This app does not handle customers,
orders, checkout, stock or payments.

## Run and validate

Use Node 24.15 or newer within the Node 24 release line. Copy `.env.example`
to `.env` and supply the Supabase URL and **publishable** key.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser checks spawn an isolated read-only fixture server using the reviewed
deployment snapshot. They need no production credentials. Set `BASE_URL` to
check a deployed app instead. A local installed Chrome can be selected with
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

## Production

- Vercel project: `leaferservice-grow-calendar`.
- Team: `team_gSAjxEFdXT0AaJmlBR01f1po`.
- Root: `apps/grow-calendar`; framework `nuxtjs`; Node `24.x`; region `fra1`.
- Build: `npm ci` then `npm run build`.
- Set the four variables in `.env.example` for preview and production.
- No secret or service credential is needed. The publishable key is server-side
  runtime configuration; public database access is SELECT-only with RLS.
- The existing Hydrogen Vercel project is independent and must retain its setup.

The root DE/EN calendars canonicalize to the existing Shopify pages. Plant and
month guides have independent localized canonical routes. The sitemap lists
these guides only. Embedded presentations use `noindex,indexifembedded`.

## Shopify entry point

Page ID `gid://shopify/Page/701524902273`, handle `aussaatkalender`, retains the
default Shopify page template. `deployment/shopify-page-de.html` and its English
translation contain the iframe, a crawlable static overview, 30 plant links,
12 month links, a useful no-JavaScript fallback and a direct standalone link.
Generate them with `node deployment/render-shopify.mjs` after reviewing an export
of the current public crop data. Deploy via PageUpdate and Shopify translations,
then verify the actual DE/EN public pages. The snapshot is deployment provenance,
not a second editable content source or a runtime data fallback.

Only exact app-origin messages from the actual iframe may resize it or scroll
to its heading on pathname navigation. Filters never scroll the host. The child
accepts initialization only from its parent at the two intended Shopify origins.
No customer data or cookies are exchanged. Sandbox permits user-initiated shop
navigation and PDF downloads. Content measurement excludes viewport min-height
to avoid resize feedback loops. Legacy `#maerz` etc. links select the correct month.

## Crop editorial model

`public.grow_calendar_crops` stores separate `start_indoor`, `sow_outdoors`,
`transplant_outdoors`, `harvest_or_flowering` arrays and `harvest_kind`.
Sources and DE/EN notes are mandatory for published entries. Empty arrays mean
the method is not part of this plan. All windows are approximate conservative
plans for temperate Central Europe; cultivar, seed packet and local conditions
take priority. Flowers show flowering rather than seed maturity. Perennial and
winter-harvest caveats live in each crop's notes. PDFs are generated from the
same public records; changes appear within the five-minute data-cache window.

The two migration files mirror the already-applied remote history. The initial
migration's broad default table grants are restricted by its follow-up migration.
Do not manually replay the initial migration against the existing hosted table.

## Rollback

For a bad application release, promote the previous verified Vercel production
deployment. Keep the Shopify route and its static fallback available. For a crop
correction, set that specific crop's `is_published` to false in Supabase, correct
and reverify its source-backed content, then republish; do not change products.
To remove the embed, restore the previously read Shopify page body and its
translation using a fresh content digest. Reverting this app requires no shop,
DNS, cart or checkout migration. Recheck DE/EN after any rollback.
