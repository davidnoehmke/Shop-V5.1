# Unified LEAFerservice experience — implementation and release gates (2026-10-09)

Status: specification only; not implemented or deployed by this document.

## Device-specific storefront
- Smartphone: independently designed touch-first Mobile UI.
- Tablet, laptop, desktop: full Desktop UI, including the established configurator experience.
- Use one canonical URL per resource; keep Shopify checkout and Supabase SSOT shared.
- Resolve device class early, with safe server/client consistency and an accessible manual UI override persisted per visitor. Never use user-agent detection alone as a correctness guarantee.
- Code-split UI shells; share domain logic, cart state, pricing, stock, knowledge permissions, and analytics.
- Preserve keyboard navigation, accessibility, tablet touch, and small desktop viewport support.

## Conversational assistant and configurator
- Answer the actual question first; do not force a product recommendation, checkout, or sales CTA.
- Keep session context across turns, including follow-up references, interruptions and topic changes.
- Ask clarifying questions only when essential; offer product links only on request or when genuinely helpful.
- Ground botanical claims and recommendations in public, synchronized Supabase SSOT records. Exclude drafts, private procurement, stale/unsynced knowledge.
- Keep text chat usable without microphone; for real-time voice support natural pace, barge-in and resume. Do not claim real-device audio validation from CI.
- Photo analysis remains disabled until separately authorized.

## Mandatory release checks
1. Review each source branch against current main; cherry-pick only missing, compatible behavior; no bulk merge of divergent legacy.
2. Test desktop and mobile UI shells independently, plus tablet-to-desktop routing, manual override, refresh, navigation and checkout.
3. Run functional configurator simulations, assistant multi-turn and interruption tests, and SSOT access-control tests.
4. Validate all public DE/EN internal routes and remove broken links.
5. Check visual centering, responsive edge cases, keyboard/touch behavior, and WCAG basics.
6. Measure LCP, INP, CLS and bundle payload on real-world mobile and desktop throttling; investigate regressions.
7. Remove legacy code only after dependency tracing and regression tests.
8. Require green CI on exact PR head, review, merge, deployment, and independent verification of live theme and Supabase function.

Do not equate a merge with a live deployment. Do not merge if a gate fails.
