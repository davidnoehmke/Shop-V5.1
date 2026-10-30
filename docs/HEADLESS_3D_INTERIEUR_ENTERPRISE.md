# LEAF Studio: Interieur Solution -> Headless 3D commerce migration

Status: architecture and acceptance baseline; implementation not yet production-ready.

## Existing source of experience

- Shopify article: https://leaferservice.com/blogs/leafers-nice2know-blog/interieur-solution-pflanzenraum
- Liquid source: `sections/leaf-interior-story.liquid`
- Existing panorama is a CSS background image with hotspots, **not** 3D geometry.
- Preserve the article content, canonical URL, structured data and SEO while making it a gateway to the headless experience.

## Preserve six **content zones**, not arbitrary camera labels

The current zone sequence consists of:
1. Overview
2. Plants
3. Planters
4. Light
5. Terrarium
6. Vertical planting

Each zone must have a stable ID, scene anchor, accessible text alternative, category deep link, and (only when verified) product associations.

## Experience requirements

- Real 3D scene with orbit/pan/zoom, physically credible lighting, soft shadows, realistic surfaces and asset LOD; use a WebGL renderer (Three.js / React Three Fiber evaluated against existing Hydrogen/React Router stack).
- Scene loads lazily; static editorial panorama and six accessible buttons remain the no-WebGL, reduced-motion and low-memory fallback.
- Make the experience discoverable from homepage, main navigation (single clear `3D-Raumplaner` entry), Interieur collection and article, without deep nested menus.
- No unverified claims about scale or actual light intensity; simulations are indicative until measurements and luminaire data are validated.
- Configure room dimensions, plant / planter / lamp placement, and show selected products with live Shopify availability and price.
- Start with existing real product media; introduce GLB/glTF assets only after brand/media rights, dimensions and authenticity are checked.
- Separate scene configuration (Supabase SSOT) from Shopify checkout authority. Scene state is not an order. Product variants, prices, stock and cart checkout must be checked via Shopify Storefront API.
- Store scene versions, material/asset references, mapping to Shopify variant IDs and provenance in Supabase with least-privilege RLS; never expose service-role secrets.
- Deploy preview first on Vercel. Require smoke tests for six zone transitions, fallback, mobile interaction, localization, cart links, accessibility and no server 500s.

## UI and design system

- Follow existing Botanical Minimalism Warm Sage & Cream tokens; gradual subtle transitions rather than neon accents or abrupt hard-edged panels.
- Product cards: consistent aspect ratios, real photography, correct pricing and contextual add-to-cart only with verified variants.
- Reduce menu depth. The 3D journey is one top-level destination; retain standard shopping and search shortcuts.
- Site must remain commerce-first. The 3D canvas may not block first contentful render or core web vitals.

## Delivery gates

1. Audit existing article, scene assets, six zones and headless route inventory.
2. Implement lazy-loaded 3D route with accessible static fallback; test mobile and WebGL.
3. Map scene objects to validated product entities and dimensions.
4. Add Supabase read model + versioned authoring workflow, access policies and migrations.
5. Wire Shopify cart and complete server-side product validation.
6. Verify CI, Vercel preview, route health and business conversion; promote only after checks.

Do not treat a draft/prototype rendering as a finished enterprise product.
