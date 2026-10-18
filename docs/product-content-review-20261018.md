# Product content consolidation — 18 October 2026

## Requested delivery

Apply the first three audit priorities to the latest unpublished theme copy so the merchant can publish it: resolve actionable source conflicts, consolidate repeated content, and link suitable existing guides.

Target: `gid://shopify/OnlineStoreTheme/190794105217`, **LEAF V6.2.4 Produktkarten Conversion**. Baseline updated at `2026-10-17T18:32:22Z`. Live theme at inspection: `190364942721`, **Shop-V5.1/main**. This change does not publish a theme or update global product, article or Supabase records.

The target copy already contains product tabs and an image viewer absent from main `0f931f7bb8b9ab4c6b186cb2667d6acda6f468c9`. Their files and gallery adjustments are retained in this branch. Missing newer main translation groups are retained additively. Upload only files changed against the target copy; do not run the staging workflow, whose configured target differs.

## Customer content ownership

| Content | Location |
| --- | --- |
| Short introduction and up to three distinct benefits | Shared purchase summary in both main product sections |
| Substrate purpose, suitability and water behaviour | Description tab from existing structured fields; full description remains fallback for other categories |
| Application, care, warning, installation and manufacturer link | Application tab; matching HowTo JSON uses the same steps |
| Finished mixture composition | One recipe section; ratio prose is a fallback when ingredient entries lack percentages |
| Product questions | Canonical `custom.faq`; legacy FAQ only when no valid canonical pair exists |
| Technical details and plant-specific facts | One product-details section, only populated values |
| Background knowledge | Up to two existing category-specific blog articles |
| Variant-specific instructions | Existing variant guide remains active |

The old decision and component-signature sections are disabled in all three affected templates. Numeric component scores are not treated as measured values. Long ingredient/knowledge explanations are no longer repeated below products. No new metafields are introduced and no missing value is fabricated.

Bims uses the structured description, replacing the old unqualified raw-description claim that it prevents waterlogging. Application and the canonical FAQ preserve the need for suitable drainage and watering.

`K`, `W` and photon-flux units are not appended twice. A textual `µmol` value is not silently changed into `µmol/s`. Recipe charts remain hidden unless parsed shares total 100%; missing percentages are not invented.

## Venso E27 Indoor Plants: source conflict remains a source issue

Product ID `15546796310913`, SKUs `E501 010` / `E501 011`.

Inspected supplier files from Library archive `libfile_84794ae3b3908191ba91c3cf21a701af`, `wetransfer_produktunterlagen_2026-09-30_1145.zip`:

- `Produktdatenblatt E501 010 Grow Light Indoor Plants 7W 30°.pdf`
- `Produktdatenblatt E501 011 - Grow Light Indoor plants 15W.pdf`

PDF metadata dates to 17 September 2024. Delivery of the archive on 30 September 2026 is not proof of a newer document revision.

Current official product page inspected: https://venso-ecosolutions.de/products/e27-pflanzenlampe-indoor-plants-led-pflanzenlampe-von-venso-copy

| Item | Supplier PDFs, 7 W / 15 W | Manufacturer page, 7 W / 15 W |
| --- | --- | --- |
| Dimensions | Ø60 × 92 mm / Ø125 × 127 mm | Ø65 × 100 mm / Ø125 × 150 mm |
| Mass | 0.10 kg / 0.25 kg | 0.15 kg / 0.35 kg |
| Recommended distance | 30–40 cm / 30–80 cm | 20–50 cm for both |
| Lifetime | More than 50,000 hours | More than 30,000 hours |
| PPF | 6.5 µmol / 32 µmol, no `/s` in the source | Not given |
| PPFD | Not given | 85 / 220 µmol/(m²s) at 30 cm |

The supplied data are sourced, but the corresponding current hardware revision is not resolved. The draft therefore excludes disputed quantitative claims from this product's summary, raw description, FAQ, application steps and technical table. It preserves purchase options, procurement notice, installation compatibility, ventilation/safety instructions and the manufacturer link. Customers can ask for dimensions/distance for their selected variant before ordering.

The guard is centralized in `snippets/leaf-product-source-status.liquid`. Clear it only after a source identifies the currently supplied model revision and resolves the conflicting values, then update canonical Supabase content through its normal validated projection. Do not add `/s` to the PDF's PPF value by assumption. Do not stamp the entire recipe/catalog as verified from general horticultural references.

## Existing guide mapping

Blog: `leafers-nice2know-blog`.

| Category | Article handles |
| --- | --- |
| Plant lights | `pflanzenlampe-watt-ppf-ppfd-abstand-flaeche`, `e27-t8-high-power-pflanzenlampe-vergleich` |
| Finished substrate mixes | `leafers-substrate-nice2know`, `substratbestandteile-perlite-bims-lava-erklaert` |
| Components | `substratbestandteile-perlite-bims-lava-erklaert` |
| Bims and Perlite individual products | `bims-oder-perlit-unterschiede-pflanzsubstrat`, `substratbestandteile-perlite-bims-lava-erklaert` |
| Confirmed potted-plant types | `interieur-begruenung-led-gefaess-substrat-pflanzen` |

Use existing article objects, check that the article exists and is published, and preserve locale-prefixed URLs. Confirmed English product types `Substrate mix` and `Substrate constituent` are supported. Unknown types, bundles, the substrate configurator and air plants are not assigned an inferred guide. Some existing EN article routes still contain German article text; this theme-only change does not translate global blog content.

## Verification

- Shopify Liquid Theme Check over every changed theme file.
- Repository JSON and DE/EN key compatibility.
- Existing delivery/policy tests and compact-mobile theme tests.
- Targeted render review for canonical FAQ/JSON parity, missing source fields, units and recipe fallbacks.
- Exact target-theme role/checksum guard before upload and checksum readback afterwards.
- Storefront preview checks recorded in the pull request after upload.

No automatic merge or live publication is part of this delivery.
