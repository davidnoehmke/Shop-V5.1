# Storefront portability and performance contract

## Goal

LEAFerservice must keep the configurators as fast as the current mobile storefront while preserving the option to replace Shopify later without rebuilding the product/content model or configurator logic from scratch.

Supabase remains the authoritative data source. GitHub remains the authoritative implementation source. Shopify is the current storefront and commerce adapter.

## Non-negotiable performance rules

1. Slider movement, visual feedback, recipe balancing and other high-frequency configurator interactions run locally in the browser.
2. No network request is allowed for every slider/input change.
3. Network calls are reserved for low-frequency actions such as loading a new dataset, saving a project, adding an item to cart, checkout, account actions or explicit AI/server features.
4. Prefer small native Web Components and plain JavaScript over framework runtime overhead for critical configurator paths.
5. Keep the current progressive rendering approach: useful HTML first, enhancement second.
6. Do not add a server hop merely to hide frontend code if that makes the interaction slower.

## Portability boundary

Configurator logic is split conceptually into three layers:

### 1. Neutral interaction core

Browser-local behavior such as:
- sliders and input state,
- percentage balancing,
- charts and visual layers,
- local sorting/filtering,
- immediate validation,
- presentation formatting.

This layer may be visible in browser DevTools. Browser-delivered code is never treated as a secret.

### 2. Neutral data contract

Profiles, recipes, product facts, lighting data, compatibility data and content come from the Supabase SSOT and are projected into the current storefront.

The current Shopify theme may render these values into HTML/JSON, but the data shape must remain platform-neutral enough to be consumed later by another storefront.

### 3. Commerce adapter

Platform-specific actions must stay at the edge:
- product/variant identifiers,
- availability,
- money/currency formatting,
- add-to-cart endpoint,
- cart URL,
- checkout handoff.

Today this adapter is Shopify/Liquid. A future storefront may replace it with a custom API/Stripe adapter without rewriting the neutral configurator core.

## Current Shopify seam

The existing custom grow creator already receives cart endpoints as data attributes instead of hard-coding a store host. Preserve that pattern.

When new configurator features are added:
- do not hard-code a `.myshopify.com` hostname,
- do not hard-code `/cart/add.js` inside neutral configurator logic,
- do not put Shopify Admin API credentials in storefront code,
- prefer injected URLs/IDs/data over direct platform calls.

Shopify Liquid objects may remain in the rendering adapter while Shopify is the storefront.

## Browser safety

Do not attempt to disable DevTools, keyboard shortcuts or F12. That is not a security boundary and harms usability.

Instead:
- never ship service-role/admin/private keys,
- never ship supplier costs or internal admin-only data unless explicitly public,
- never ship source maps in production,
- never ship TypeScript source files to the storefront,
- do not embed private API routes or credentials in HTML, Liquid, JavaScript or JSON.

If a future TypeScript build is introduced, TypeScript stays in the private repository/build environment and only optimized JavaScript artifacts are deployed.

## Source ownership

- Supabase: product/content/SEO/configurator data SSOT.
- GitHub: code, migrations, tests, contracts and release history.
- Shopify: current storefront/commerce projection, replaceable.
- Future custom storefront: another projection of the same Supabase/GitHub sources.

## Exit path from Shopify

A future Shopify exit should be incremental:

1. Keep current Shopify storefront stable.
2. Extract reusable configurator cores only when a feature is already being touched.
3. Expose/consume normalized Supabase-backed product and configurator contracts.
4. Build a parallel storefront against those contracts.
5. Add a new commerce adapter for cart/payment/checkout.
6. Run both storefronts against the same SSOT during validation.
7. Switch the domain only after functional, SEO and performance parity is verified.

No big-bang rewrite is required.

## Performance acceptance

Any portability change to a critical configurator must preserve:
- immediate local input response,
- no input-triggered server roundtrip,
- no unnecessary framework/runtime dependency,
- mobile performance at least equal to the previous production state,
- desktop performance measured against the same interaction and rendering budget.
