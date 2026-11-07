# LEAF Premium Theme consolidation – implementation contract (2026-11-07)

Status: implementation branch, NOT approved for publication.

## Scope and source hierarchy
1. Production Shopify theme is the visual/commerce baseline; read back its actual files and settings before changing them.
2. GitHub Shop-V5.1 main and open PRs #257 and #261 are candidate sources, not automatically mergeable features.
3. Review Leaferservice_v7.2, leaferpage and seo-performing-leaferservice for reusable components; import only after license, compatibility and performance checks.
4. Follow repository README: Supabase is the editable domain/content SSOT; Shopify is the commerce/storefront projection. Never overwrite newer production data with stale repository exports.
5. No Headless DNS/domain cutover. No MAIN-theme direct writes.

## Ordered delivery
### 1. Foundation
- Inventory current Shopify live/unpublished themes, repository branches, active PR heads and CI gates.
- Record current live theme ID, main SHA, candidate SHA and file/setting checksums.
- Identify and reconcile existing design tokens, responsive navigation, DE/EN locale keys and mobile layouts.
- Preserve newer live-only sections, app blocks, metafields and settings.

### 2. Premium commerce
- Build reusable accessible Liquid sections/snippets for editorial landing, collections and product pages.
- Support touch/swipe variant media with explicit accessible controls and reliable variant image mapping.
- Single canonical product title, description, price, delivery message and structured-data owner.
- No fictitious ratings, inventory, delivery promises, performance data or manufacturer claims.

### 3. Data intelligence
- Map plant, substrate, pot, LED and compatibility records to validated metaobjects/metafields.
- Keep high-frequency configurator interactions local; persist only user-requested plans with appropriate consent.
- Validate substrate fractions sum to 100%, litre calculation, SKU mapping and cart line properties.
- Add compatibility and recommendation rules with explainable sources and safe missing-data fallbacks.
- Room Studio and photo measurement require explicit capability checks; never claim accurate measurements from a photo without calibration.

### 4. QA and release gates
- JSON/Liquid/theme-check, locale parity, unit/regression, accessibility and reduced-motion checks.
- Actual browser QA in DE/EN at 320–430px and desktop, 200% zoom, navigation, product, cart, assistant, configurator collapsed/open/reopened, checkout routing.
- Preview must be reconciled against the exact commit head with file checksums. Review Shopify-normalized app blocks separately.
- CI and required approvals must pass; never weaken gates or force-merge.
- Merge only the verified head, verify native Shopify deployment and public routes separately; update freeze only after successful live QA.
- Never create orders in QA. Clean up only QA-created cart lines.

## Current known release risks
- PR #261 (head 1bbd1d0f34d0c537dad397c644eb6ebd002ac4a9) is open/draft; Vercel status success alone is not full acceptance.
- PR #257 remains open/draft and documents staging/live drift, blocked direct MAIN writes and an HTTP 503 upstream browser-validation limitation.
- Existing README says the storefront freeze can be changed only for verified defect or owner-authorized work; this user explicitly authorized a premium redesign, but technical gates remain mandatory.
- This file is a delivery contract, not evidence that any UI feature has been implemented or deployed.
