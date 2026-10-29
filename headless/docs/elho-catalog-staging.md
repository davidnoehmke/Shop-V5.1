# elho catalog staging — LEAFerservice

Status: development only; never auto-publish. Source: supplier-provided 2027 retail order workbook (PG19 DACH, valid from 2027-01-01). Source may contain wholesale prices: NEVER commit source workbook or wholesale price fields to Git.

## Pipeline
1. Read all supplier workbook tabs, enumerate sellable rows by EAN and manufacturer article number. Record source tab, season, availability phase, packaging unit and product family. Preserve exact strings for EAN and SKU.
2. Deduplicate against existing Shopify products by EAN then SKU, not handle/title. Report collisions; never overwrite live data silently.
3. Group only verified variants of the same model (size and colour); avoid merging products with different functions, materials or irrigation systems.
4. Join official image assets by SKU/EAN and verify permissions. Missing image -> review, not invented URL. Generate descriptive alt text only for verified image subject.
5. Build unique editorial copy per product family from verified technical facts; no unsupported assertions about drainage, recycled content, outdoor use, or irrigation. Include useful FAQs only where the answers are supported.
6. Use Shopify for commerce and prices; do not expose supplier EK. Use Storefront API for visible product data; generate JSON-LD Product only for actual products. Validate variants, currency, availability and canonical URLs.
7. Export dry-run changes and QA report: total rows, duplicate SKU/EAN, unverified images, missing attributes, blocked products, price anomalies and SEO duplicate titles.
8. Create/update Shopify DRAFT products only after validated dry-run and review of existing product mapping; never publish, change live products or merge automatically. Observe supplier terms, inventory and freeze.
9. Validate DE/EN routes, responsive rendering, accessibility, cart and search engine metadata before requesting go-live.

## Organic SEO
- Category hub: /collections/pflanzgefaesse with LEAFerservice visual identity.
- Manufacturer hub: elho; product family hubs with specific buying guidance, internal links to relevant substrate/accessory categories.
- Intent clusters: model + size + colour; 'Übertopf oder Pflanztopf', 'Topfgröße für [plant]', 'Pflanztopf mit Wasserreservoir' only for verified reservoir products.
- Never generate 1,957 thin doorway pages or repeat the same FAQ across every variant.
- Measure organic landing pages, indexed URLs, Search Console impressions/clicks and checkout conversion; avoid invented SEO rankings.

## Go-live gate
Not ready until all supplier data, images/rights, variant mapping, pricing, availability, SEO and technical checks pass. Keep PR open until required CI and device QA pass.
