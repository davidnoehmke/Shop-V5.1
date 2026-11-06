# Storefront error corrections — 6 November 2026

The public storefront is Shopify Liquid theme 191028625793, not the Vercel preview. The published theme was read before preparing changes. The existing unpublished staging theme 190712709505 is now named `LEAF V6.5 Fehlerkorrektur 2026-11-06`; its original changed files and metadata were backed up in the session workspace. Current live files were copied to staging before applying narrow fixes, preserving newer live-only sections and settings. It is not a wholesale deployment of this repository.

## Corrections

- Restore four backwards-compatible DE/EN product-details, guides and recipe-chart translation keys used by the published theme.
- Resolve merchant image alt text and variant headings before translation; never send completed image markup or a merchant-entered heading through the translation filter.
- Protect empty substrate slots so initialization and subsequent profile, volume, price and recipe changes complete.
- Allow the compact header menu wherever CSS actually displays its control, including desktop layouts.
- Keep Booster as the title/description emitter; base fallback decisions on explicit template ownership instead of stale external configuration flags. Preserve optimized metadata and translated secondary-market defaults.
- Remove an extra Liquid endif and duplicate newsletter setting in repository sources. Add locale/reference, schema-identifier and empty-slot regression coverage.
- Extend the existing headless mobile/footer candidate with a working assistant-open event, translated DE/EN UI and search/catalog pages, valid inline Money markup, correct article-search paths and links to the actual Shopify contact form.

The six public lighting fields already requested by the headless comparison were present in Admin and marked storefront-visible in the canonical registry, but all their Shopify definitions had Storefront access NONE. Their definitions were corrected to PUBLIC_READ: rated_power_w, ppf_umol_s, beam_angle, recommended_distance, socket_connector and cct_k. Product values, prices, status and sales channels were not changed. Missing Venso PPF/CCT remain missing; no facts were invented.

## Evidence

Before changes: 48 representative DE/EN public routes returned 200. All 14 sampled product routes exhibited one or more of the four missing keys. Direct and section-local locale references were inspected, plus 308 dynamically selected keys from 23 families. Desktop menu and the substrate initialization failure were reproduced in Chromium. Contact forms and ordinary product variant selection were verified on the actual live store.

Local checks: 131 repository tests and 32 headless tests pass. Typecheck passes. The isolated headless proposal passed lint, Vercel build/handler checks and a DE/EN Chromium SSR/hydration interaction smoke. Four Liquid rendering scenarios confirm exactly one title and one description with primary/secondary locales and optimized/fallback metadata. The minimal Liquid configurator fix also passed the original-method regression and an isolated browser override interaction check.

## Release limits

The Shopify connector blocks published-theme file writes and theme publication. Staging writes succeeded, but final browser acceptance is currently blocked by HTTP 503 from the execution environment's upstream Shopify tunnel, before shop HTML is delivered. This infrastructure response is not evidence that the store itself is down. No claim of successful live theme repair or final staging browser acceptance is made.

The staging theme intentionally retains newer live-only content. It is not byte-identical to the entire PR theme tree, so no exact-head `leaf-preview` marker is asserted. A merge alone will not update the currently published theme: `Shop-V5.1/main` is a separate unpublished Shopify theme.

Do not merge with failing relevant CI. Do not publish before checking the staging theme ID, DE/EN translations, exactly one title/description, desktop/mobile menu and substrate 0–4 components, removal, reopening, profile/volume and cart properties. Publish the reviewed staging theme through Shopify Admin when browser acceptance is available, then verify the public routes. Keep the existing published theme as rollback. No domain cutover, freeze update, purchase or customer-contact submission is included.
