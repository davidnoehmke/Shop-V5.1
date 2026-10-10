# Bundle-only pilot: product roles, quantity plan and release gates

Date: 2026-10-11. Owner: LEAFerservice. This document accompanies the **SSOT changes already applied** and the idempotent migration `20261011020000_bundle_only_pilot_intent.sql`.

## What is applied now

- The following six *existing* variant SKUs have `core.product_variants.data.merchandising.requested_sales_mode = "bundle_only"`:
  - `lf-Kokos-1` — 5 coconut tabs; future mini set.
  - `lf-Kokos-2` — 10 coconut tabs; existing Anzucht Starter Set.
  - `LF-ANZBECHER-5` — 5 compostable propagation cups; future mini set.
  - `LF-ANZBECHER-10` — 10 cups; existing Anzucht Starter Set.
  - `LF-ANZTOPF-TERRA-65` — **one** 6.5 cm terracotta seed pot; planned quantity **five** in the mini set.
  - `LEAF-RANK-SCHWARZ` — single modular black plant support; additional *choice* in the Monstera & Philodendron Rank-Set.
- All six remain active and individually purchasable. The flags express intent, **not** enforced behavior: `standalone_checkout_blocked = false` and `rollout_status` describes the missing gate.
- No variants, inventory quantities, shipping settings or public prices were changed.
- `anzucht-mini-set` and `leaferservice-blumat-12-pflanzen-pilot` are **blocked, unpublished SSOT draft** bundles; they are not live Shopify products.
- Five already defined bundles carry a 90-day sales *target* totaling 9 sets; the unpublished Blumat sourcing pilot brings the planning target to 10. Targets are **not** physical stock allocations and do not justify fulfilling orders.
- Rank-Set: a third selection was added to the SSOT choice group. Its publication is blocked pending distinct selection-price and checkout QA.

### Starting quantities (sales targets, NOT on-hand stock)

| Bundle | 90-day target | Per-set requirements |
| --- | ---: | --- |
| Anzucht Starter Set | 3 | 2 L Seed & Cutting Mix, 10 coconut tabs, 10 cups, 1 propagation box |
| Anzucht Pro Set | 1 | 5 L Seed & Cutting Mix, 25 tabs, 25 cups, 1 propagation box, 1 heating mat |
| Aroid Umtopf-Set | 2 | 5 L Alocasia Mix, 1 L pumice, 1 L pine bark, 1 potting mat |
| Efeutute Hänge-Set | 2 | 1 Efeutute, 1 hanging basket, 2 L Tropical Mix |
| Sukkulenten Trio | 1 | 3 live succulents, 2 L Cactus & Succulent Mix |
| Blumat 12-plant pilot | 1 sample | Obtain verified original product, price, delivery agreement and practical test |

The *draft-only* Anzucht Mini Set is **not** counted in the ten: 2 L Seed & Cutting Mix, 5 coconut tabs, 5 cups, 5 separate 6.5 cm pots.

### Critical operational findings

- Variant inventory in `core.product_variants.data` currently says `inventory_management = false` and `continue_selling_when_out_of_stock = true`; quantities of 25 at Shopify do **not** prove real physical stock. Do not allocate these as inventory.
- Several bundle variants show stock 0 in Shopify. Verify that checkout succeeds *and* that the correct components are fulfilled/decremented before describing a bundle as ready.
- Bundle table `discount_percent = 10` conflicts with `merchandising.discount_percent = 5`; the pilot records a pricing review, without changing either value or storefront prices.
- Sukkulenten Trio: Supabase 31.31 EUR versus observed Shopify 34.99 EUR; do not silently overwrite.
- Cost prices are blank in the surveyed SSOT variants; seller margin/discount claims require verified cost of goods, handling and shipping.
- Blumat set ASIN `B008PXHY3A` is a sourcing **candidate**, not approved supplier stock; no Amazon content/photos are licensed by default.

## How to make a variant *genuinely* bundle-only (future release)

Do **not** rely on CSS, Liquid, the product status, a variant metafield, or a hidden option as checkout enforcement. Those only affect the storefront UI. Shopify products with multiple variants cannot simply unpublish one variant across every sales channel.

1. Confirm the product/variant mapping and supported bundle mechanism (native Shopify fixed bundle or a supported bundle app). Verify the parent SKU, component quantities and order/fulfillment decomposition; do not infer from `shopify_sync_status = synced`.
2. Implement/verify **server-side** restriction on standalone checkout for the six component variants (for example an appropriate Shopify cart/checkout validation function), without rejecting an authorized component in a genuine parent bundle. Test buy-now, Storefront API, Online Store, Shop and any enabled sales channel. Restriction must be available under the merchant's actual Shopify plan/app setup.
3. Create projected **variant** metafield `leafer.bundle_only_enforced` as a boolean; publish `true` from the Supabase control process **only after** the server-side restriction and the related parent bundle have passed QA. A missing metafield or `false` must fail open for the user to prevent accidental sell-out.
4. The `sections/main-product.liquid` guard introduced in this PR reads only `leafer.bundle_only_enforced`. It labels those options "Nur im Set" and disables both primary and mobile-dock purchase buttons for the selected variant; it does **not** enforce checkout on its own.
5. Validate that the 25/50/100 packs and all other unflagged variants remain purchaseable, bundles add to cart as intended and the customer-facing links lead to a purchasable parent bundle.
6. For Headless/Hydrogen, add the same merchandising state to the product query and cart action *after* the server-side guard exists; storefront-only filtering is not enough.
7. Deploy via approved GitHub PR -> green CI -> unpublished Shopify preview -> product/cart/checkout QA -> explicit production approval. Read back Shopify and Supabase after sync.
8. On success mark SSOT `standalone_checkout_blocked=true` and `rollout_status=active`. Do not activate `leafer.bundle_only_enforced` otherwise.

## Test cases before publishing

- Standalone purchase of all six flagged variants is rejected **server-side**, including API/direct URLs/Buy Now.
- Same component variant inside a valid parent bundle completes payment and yields correct fulfilled component items.
- For the Mini Set, exactly five 6.5 cm pots and five cups are shipped; do not confuse one multipack with five single-pot units.
- Every unflagged variant of the same four parent products remains selectable and purchasable.
- Price, final discounted price, shipping, taxes, inventory and returns are correct, including a bundle with live plants.
- A draft/unpublished bundle cannot be accidentally projected by the regular sync.
- A checkout-restricted SKU is not simultaneously marketed on Shop/POS or an unsupported third-party channel.
- The webshop does not claim a "10 % Vorteil" while discount fields contradict.
- Removing a pending bundle-only intention immediately leaves an individually purchasable SKU; rollback requires no historic price change.

## Deferred decisions

- Confirm whether Blumat is available under a wholesale/supplier agreement (and define the actual kit/reservoir SKU).
- Confirm reliable physical stock, component procurement prices, logistics and product photo rights.
- Do not run a bulk product status change, auto-publish new products, turn on inventory tracking, or merge code with red CI to force rollout.

## Shopify Admin GraphQL bundle verification (2026-10-11)

Read-only data: `ProductVariant.requiresComponents`, `availableForSale`, `inventoryQuantity` and `Product.bundleComponents`.

| Live Shopify bundle | requiresComponents | Shopify components shown | API says availableForSale | Follow-up |
| --- | --- | ---: | --- | --- |
| Anzucht Starter Set | true | 4, matching SSOT | true | Cart/order and inventory verification still needed |
| Anzucht Pro Set | true | 5, matching SSOT | true | Cart/order and inventory verification still needed |
| Aroid Umtopf-Set | true | **0** | true | Investigate why bundle components are absent in Admin API readback |
| Efeutute Hänge-Set | true | **0** | true | Investigate why bundle components are absent in Admin API readback |
| Sukkulenten Trio Set | true | **0** | true | Investigate why bundle components are absent in Admin API readback |

Each inspected Shopify parent variant reports `inventoryQuantity=0` and `inventoryPolicy=CONTINUE`. This does not prove a real physical stock quantity. `availableForSale=true` is not an end-to-end checkout or fulfillment test. Components reported as zero in the Admin API might reflect an incomplete native-bundle definition or a different bundle integration; investigate before deciding to rebuild or change a production offer.

The live readback is stored in SSOT `product_bundles.merchandising.pilot.shopify_native_bundle_readback`, with checkout and automated inventory test explicitly `not_performed`. Do not auto-reconcile or auto-replace an active bundle merely because the API field is empty.

