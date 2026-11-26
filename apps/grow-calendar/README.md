# LEAFerservice Grow Calendar

The live calendar is a **native Shopify Online Store page**. Shopify serves its
HTML, CSS and optimized TypeScript build. There is no iframe, Nuxt server, Vercel
request or framework runtime in the native storefront path. Supabase remains
the authoritative source of reviewed crop data. GitHub owns implementation and
release history; Shopify is the storefront projection and commerce adapter.

## Native storefront

- Main page: `/pages/aussaatkalender` (existing page ID `701524902273`).
- Thirty plant pages: `/pages/aussaatkalender-<crop-slug>`.
- Twelve month pages: `/pages/aussaatkalender-<German-month-slug>`.
- English uses `/en` before the same handles and native Shopify translations.
- Template: `templates/page.grow-calendar.json`.
- Section: `sections/leaf-grow-calendar.liquid`.
- Browser implementation: `native/calendar.ts`; platform-neutral public HTML:
  `native/render.ts`; shared crop/filter contract: `shared/calendar.ts`.

Every page already contains useful headings, plant data, sources and real links
before JavaScript runs. Search, category, activity and month filtering run
locally using the reviewed data embedded in Shopify HTML, with one high-priority
background read of the public Supabase dataset. Input changes cause no
network request. Query parameters, history and old `#maerz` links are supported.
Month pages retain their own month-specific heading, content and canonical.

The section injects the public API URL, **publishable** key and asset URLs.
The key is intentionally public; SELECT-only grants and published/verified RLS
enforce the data boundary. Only explicit public columns pass `safeCrop()`.
No admin credentials, private fields, TypeScript sources or source maps reach
Shopify theme assets. The isolated CSS uses the private `leaf-gc-` namespace and a component ID.
Responsive font priorities override the host’s global compact-heading rules only
inside the calendar; unrelated hero, button and theme styles remain untouched.

## Build and verify

Use Node 24.15 or newer within the Node 24 release line.

```sh
npm ci
npm run typecheck:shopify
npm run build:shopify
npm run check:shopify
npx playwright install chromium
npm run test:shopify
```

The build creates four optimized files in the theme's `assets/` directory, a safe JSON bootstrap
snippet in `snippets/`, and
43 DE/EN page payloads in ignored `.native-build/pages.json`. The check command
rebuilds and compares every committed asset, preventing source/artifact drift.
Browser checks run an isolated read-only fixture with the actual host heading
rules and observed hero/button overrides, require no production key,
and exercise real PDF downloads, local filtering, history, keyboard focus,
mobile layout, no-JavaScript HTML and error/retry paths. A local browser may be
selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

`native/pdf.ts` bundles pdf-lib in one separate ESM Shopify asset. It loads only
when a reader requests a PDF and creates the document from the same validated
record displayed on the page. Printed detail links point to native Shopify
pages. A visible Blob link remains available after the automatic download
attempt, including for browsers that open a PDF viewer. No PDF server or stored
PDF version is required.

## Public data projection and updates

`public.grow_calendar_crops` stores distinct `start_indoor`, `sow_outdoors`,
`transplant_outdoors`, `harvest_or_flowering` arrays and `harvest_kind`.
Sources and DE/EN notes are mandatory for publication. Empty arrays mean a method
is not part of this plan. Time windows are approximate for temperate Central
Europe; cultivar, seed packet and local conditions take priority. Flowers show
flowering rather than seed maturity.

`deployment/reviewed-crops.json` is the reviewed release export, including actual
database timestamps, not a second editorial source. The native build creates
an allowlisted public JSON snapshot, a safe JSON-in-HTML bootstrap and page HTML
from it. Controls are immediately usable from that reviewed data while the live
request revalidates in the background (20-second transport limit). If the live read
fails, the page visibly identifies the last reviewed snapshot; if both reads
fail, already published HTML stays readable. Successful live reads, including
an empty publication list, take precedence over snapshots. A withdrawn detail
loses its download and displays an unavailable state after revalidation.

For a content revision, edit and verify Supabase first, export the current public
records into the reviewed release export, rebuild/check assets, and regenerate
the Shopify page bodies and translations. **A data withdrawal must also update
the stored Shopify projection** if it must disappear from no-JavaScript HTML
and outage fallback immediately. Each page load revalidates live data; an
already-open tab keeps the version it loaded, including its matching PDF.

## Publishing

1. Review native source, generated assets and scoped theme changes in a PR.
   Run native CI and existing repository/theme checks without weakening gates.
2. Merge the reviewed head. Verify the GitHub-to-Shopify connection delivered
   the exact new asset/Section/template bytes to the actual MAIN theme.
3. Before the entry-page cutover, place generated DE/EN HTML in that page's
   temporary `custom.grow_calendar_preview` JSON metafield. Preview it through
   `/pages/aussaatkalender?view=grow-calendar`. The default page remains on its
   existing template until explicitly switched. This alternate view is **not**
   an exact-PR whole-theme preview and must not be labelled as one.
4. Create the generated plant/month pages with the calendar template, native
   SEO metafields and fresh-digest English translations. Check each public URL.
5. Switch the existing calendar body/template and register the English body
   using a newly read translation digest. Verify actual DE/EN pages, filters,
   source data and PDF downloads. Remove the temporary preview projection.

Only calendar-specific files and data are part of this release. Do not commit
or publish unrelated pending theme edits. The native layout title/description
emitter is limited to the exact `grow-calendar` page template.

## Rollback and legacy app

Keep the pre-cutover page body, template and translations in the release record.
Restore them with fresh translation digests if native delivery fails. Reverting
the page/template does not require any DNS, cart, checkout or customer migration.
For a native code regression, revert the scoped GitHub change and verify actual
Shopify file delivery. Do not remove shared Supabase tables or grants.

The previous Nuxt/Vue app (`app/`, `server/`) and iframe generator
(`deployment/render-shopify.mjs`) remain a legacy compatibility/rollback path.
They are not the live Shopify entry point after cutover. Their old Vercel project
is `leaferservice-grow-calendar`; the unrelated Hydrogen project must retain its
setup. Existing Nuxt tests remain in CI until the compatibility path is retired.
Do not use the old iframe generator for native page updates.

The two database migrations mirror already-applied remote history. Do not replay
the initial migration against the existing table; its follow-up restricts public
roles to SELECT and enforces publication prerequisites.
