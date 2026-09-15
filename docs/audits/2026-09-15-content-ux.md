# Content and usability audit - 2026-09-15

## Release status

Base commit: 336197541024d44fd528cd73a7515f1888fe18d2.
Nine theme files were written to the unpublished Shopify theme `LEAF Content-UX Audit 15-09-2026` (theme ID 190367662465), duplicated from live theme 190364942721. Shopify returned no file-write errors. All nine returned MD5 checksums matched the locally tested files.

This change does not publish a theme, merge to main, change product prices, alter inventory, edit orders, or enable deployment. The published theme was not changed by this audit.

## Changes

- Centralize typed text/list/boolean metafield output. Preserve all 22 existing product fact fields and the existing warning/difficulty fallbacks.
- Use one FAQ resolver for visible HTML and FAQPage JSON-LD, including custom JSON entries, leafer FAQ fields and Vitals fallbacks. Omit empty question-answer pairs and duplicate questions. Escape JSON script content.
- Remove the duplicate FAQ beside the purchase form in the current templates; product-seo-details owns the visible block. Standalone rendering remains an explicit opt-in for future templates without that section.
- Hide unavailable PDF downloads, remove empty links, preserve the product-level PDF fallback after variant changes, reject unsafe URL schemes, and retain a 44px minimum button height.
- Add a page-level H1 to the configurator template without removing its project planner, selector, breadcrumbs or recipe section.
- Correct the fixed-only recipe explanation, improve selection and component copy, and add practical quantity-planning and pre-order checks. Preserve product handles, option names and purchasing code.

## Verification performed

36 local static checks passed: section/template JSON, Liquid block balance, render dependencies, retained fact fields, shared FAQ source, configurator structure, sample JSON-LD serialization and JavaScript syntax.

14 isolated Chromium checks passed at 320px and 1280px: missing PDF, product fallback, variant precedence, fallback after the existing purchase update, link removal, unsafe URL rejection and minimum touch-target height.

These checks are not a full Shopify Theme Check or a whole-store browser audit. The preview fetches could not be completed in the audit environment. No full Liquid runtime render, end-to-end cart/checkout, Lighthouse/Core Web Vitals, Search Console index coverage, or complete item-by-item catalogue audit is certified here.

## Remaining release gates

Review the actual Shopify preview on mobile and desktop, confirm that every current product template renders exactly one FAQ block, compare FAQ HTML with emitted JSON-LD, verify the single page-level H1, test variants and configurator line-item properties in the cart, and run the repository CI/Shopify Theme Check before publication.

The pre-existing `Shopify Staging Delivery` run 34932860782 on main ended in failure on 2026-09-15. This audit does not claim that the deployment pipeline is repaired. Diagnose and resolve that separate release gate without allowing live-theme writes.

FAQ content is maintained for users and consistent semantic data, not as a promise of Google FAQ rich results. Google Search Central's changelog states that FAQ rich results stopped appearing on 2026-05-07.
