# LEAF entry gateway: first implementation slice

Branch: feature/leaf-intent-gateway-20261031
Base: main / 149ebf3e23bd1441b75fb7c8bec537894ff26e83
Scope: headless homepage only, German and English. No DNS, domain, Shopify theme,
checkout, payment, product data, database, or Room Studio PR changes.

## Delivered

- Intent-led homepage with six native disclosure cards: plant help, light,
  substrate, living/containers, propagation and watering.
- Each card links to existing localized destinations. No forced quiz, sign-up or
  JavaScript-only navigation. Direct shop, search and guide access remains.
- Approved Warm Sage & Cream tokens and inherited Helvetica stack; responsive
  layouts, 44/48px touch targets, keyboard focus and reduced-motion handling.
- Existing Shopify substrate query and prices retained. Editorial previews use
  actual published Shopify articles, not generated claims or placeholder stories.
- Both locales share the rendering and data loading. Blog-preview failure does
  not fail the commerce query. Existing detailed article URLs are not changed.
- No new cookies, analytics calls, guest identifiers or photograph uploads.
  This is not a claim that the whole pre-existing platform is tracking-free.

## Verification

Run in headless/: npm test; npm run typecheck; npm run build:vercel.
The added entry-gateway.test.mjs checks locale parity, destination constraints,
SSR-friendly disclosure structure, data-minimization boundaries and palette usage.
Verify actual rendering at 375px and desktop in the Vercel preview before merge.
Verify each destination with live catalog data; a matching route is not proof of
available inventory. No conversion, ranking or performance gains are claimed.

## Explicitly not delivered by this PR

Photo analysis, secure server-side guest-plan IDs, PDF reports, account project
management, subscriptions and automatic shipments, a finished room editor,
plant-specific lighting assessments, new article production and animated videos.
The global LEAF assistant is retained, not represented as repaired or tested.
In main, homepage buttons dispatch leaf:assistant:open but the assistant has no
matching listener; this gateway removes those dead buttons rather than claiming
that speech or photo-analysis capabilities are ready.

## Remaining acceptance gates

CI/typecheck, live preview navigation and mobile browser QA, full knowledge/content
parity audit, assistant mobile repair, and user approval of the new entry design.
No merge, production promotion, DNS cutover or expansion of data collection is
implicit in this development PR.
