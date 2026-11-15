# LEAFerservice Headless Enterprise migration — execution gates

## Scope and destination

Move **all public storefront page rendering** from Liquid to server-rendered Hydrogen / React Router on Vercel, while preserving Shopify as commerce engine (catalog sellability, prices, cart, checkout). Supabase LEAFerservice-SSOT governs audited editorial enrichment, recipe definitions, scene metadata and publish revisions. GitHub is version-controlled delivery source. Liquid remains a rollback route until the headless storefront is proven production-ready.

## Current verified code inventory (2026-10-30)

- `headless/app/components/SubstrateConfigurator.tsx` already supports max four material parts, rebalanced 100% composition, selects Shopify variants and sends recipe as cart line attributes.
- The visual `substrate-pot-visual` is currently stacked 2D HTML; it must not be described as full 3D.
- `headless/app/routes/products.leafer-substrat-konfigurator.tsx` server-loads product and collection and currently carries `noindex,nofollow`; **do not remove** until canonical URL, search indexing and route health verified.
- `headless/app/routes/en.products.leafer-substrat-konfigurator.tsx` exists; DE/EN parity needed.
- `sections/substrate-configurator.liquid` and `sections/leaf-interior-story.liquid` are legacy capabilities to migrate.
- Latest Vercel preview deployments were QUEUED/BUILDING at inspection; this is not a green production gate.

## 3D substrate journey

1. SSR HTML: product name, variant options, material selectors, 100% numeric allocation, price, cart action, context descriptions. Form stays keyboard accessible without 3D.
2. Introduce a **real 3D** GLB/glTF planter scene with transparent cutaway mode, physically plausible dimensions, camera orbit and sectioned material views. Avoid falsely claiming accuracy of simulated granules or visual layers.
3. On each slider update, change GPU scene mesh heights/colors efficiently; keep one authoritative numeric state and existing `rebalance` logic. Maximum 4 materials, integers >=0, exact total=100 invariant; test all boundaries and removal/reorder behavior.
4. Optional layer ordering and preset recipes must not quietly modify validated purchase recipe; serialization and Shopify line properties require deterministic canonical order and sanitized strings.
5. Defer models until visible. For reduced motion or no WebGL, retain existing accessible 2D HTML representation. Never disable checkout when only 3D is unavailable.
6. Keep price/available variant exclusively from Shopify. SSOT may store component information, model mappings, recipes and render order. Never calculate authoritative checkout price from client-provided recipe.
7. Sync configuration to Supabase after explicit save, only with privacy-safe session and RLS. Anonymous browsing and building remain possible without database writes.

## Whole-shop Enterprise product delivery

- **Navigation:** max two levels; primary entry points Shop, Substrate (3D), Raumplaner (3D), Pflanzenlicht, Pflanzenwissen; global search, cart and assistant accessible without labyrinths.
- **Storefront:** SSR HTML-first product / collection / content / brand / article pages, stable image ratios, real product image provenance, visible price, availability, variants, shipping conditions, clear actions, structured data and canonical URLs.
- **Internationalization:** all DE/EN routes and fallbacks; locale link parity; user-facing descriptions concise.
- **Performance:** No splash screens; SSR critical HTML, defer WebGL and nonessential JS, compressed model assets, viewport-based loading; target Core Web Vitals LCP <=2.5s, INP <=200ms, CLS <=0.1 at p75.
- **Security:** RLS on all exposed Supabase tables, deny client access to secret/service keys, scoped server mutations, no broad write permissions, audit trails and reviewed migrations.
- **Assistant:** accessible from content / product / configurator but not Shopify Checkout. No independent price or inventory source.
- **Conversion:** directly purchasable variants, trustworthy product media, verified shopping cart to Shopify-hosted checkout, consent and legal pages, e-commerce event analytics.
- **Resilience:** fallback when 3D/WebGL, Supabase, or enriched content fails; no fake product availability or broken purchase actions.

## Rollout sequence

G1 Audit routes, assets, SEO canonicals, existing capabilities, Supabase schemas and live Shopify Checkout.
G2 Perfect SSR homepage, navigation and product/collection commerce fundamentals; prove a paid-flow test through Shopify test mechanisms.
G3 Upgrade substrate configurator to real 3D with cross-device fallback and recipe invariant tests.
G4 Upgrade Interieur six editorial zones to real 3D with product mapping.
G5 Migrate remaining branded worlds, blog content, legal pages, multilingual routes and SEO redirects.
G6 Run CI, Playwright, accessibility, device/WebGL fallback, 404/500 checks, model loading and Lighthouse. Compare actual field metrics.
G7 Stage production build without domain cutover, validate critical routes and checkout, then promote; retain rollback and Liquid until operational sign-off.

## Hard acceptance requirements

- Production checkout end-to-end and cart line recipe preserved.
- All formerly indexed URLs resolve or 301 correctly; no accidental duplicate index/noindex changes.
- Product catalog and media provenance verified; missing images never silently invented.
- Zero unverified pricing/stock/currency from Supabase.
- DE/EN, mobile, reduced-motion and no-WebGL fallbacks verified.
- 3D visuals optional to commerce and never used as an excuse for a blank page.
- Deployment and rollback evidence attached to PR before merge.
