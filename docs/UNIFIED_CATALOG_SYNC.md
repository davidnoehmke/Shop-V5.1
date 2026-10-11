# LEAFerOS unified catalog sync – architecture / rollout

Status: Phase 1 Shopify -> Supabase complete readback performed manually, but NOT an operational automated two-way synchronization. The previous shopify-bulk-import edge function returns HTTP 410. Do not reenable it.

## Domains and authority

- Shopify is the human editing surface for the live catalog: product/variant identity, price proposals, SEO, product HTML and gallery.
- Supabase is the central SSOT for vetted content, metafield registry, approvals, provenance, conflict policy, media manifests, and the historical audit trail.
- Shopify updates to Supabase-owned fields must become review candidates; they must not automatically overwrite verified canonical text, current prices, media or release decisions.
- Product GIDs, variant GIDs, and Media GIDs are primary identifiers. SKU/handle are mutable business attributes.
- Product/collection media includes ordered media GIDs, alt text, original URLs, dimensions, variant associations, and provenance. A linked CDN URL is not a backed-up image binary nor a license.
- Distinguish missing, empty, intentional deletion and incomplete pagination. An incomplete response must never delete media or variants.
- Current draft/active state, inventory sellability rules, Soltech authorization and original branding must remain protected.

## Inbound pipeline

1. Shopify app-scope webhooks for product, metafield, collection changes, with validated topic support; HMAC-SHA256 on original raw request body, strict shop allowlist and event deduplication.
2. Return quickly, store event in shopify.webhook_events. One secured worker fetches Admin GraphQL current state, not the potentially stale webhook payload.
3. Fetch all pagination, including variants, media, metafields, collection membership and variant/image associations. Reject partial readbacks.
4. Store immutable, timestamped snapshots with stable SHA-256. Update the Shopify mirror only when source updatedAt is newer; never overwrite newer snapshots.
5. Compare field-by-field against canonical Supabase state. Registry type and ownership decide whether observed value is accepted, ignored, or queued for approval.
6. Keep a separate asset manifest for original binary location, hash, source licenses, approval and readback. Back up bytes only when rights and access permit; do not treat offsite CDN links as immutable backups.
7. Poll periodically to repair missed webhooks, reconcile cursors, and detect count mismatches. Missing product/photo in a partial read must not be treated as deletion.

## Outbound pipeline — disabled until gated acceptance

1. One worker and one operation idempotency lease; no redundant Shopify writer.
2. For each approved field change, reread target from Shopify and compare latest version/hash to reviewed base version.
3. Apply the smallest permitted typed metafield, content, variant-price or approved additive media change.
4. Media publishing requires real rights, exact variant/product truth, visual check, source and output hashes, reviewed_by, reviewed_at and output readback. No unapproved three-image/photo-series publishing.
5. No automatic publication/channel changes, inventory-policy changes, status downgrade or brand artwork replacements.
6. Verify post-mutation Shopify readback. Record actor, source, reviewed hash, base version, new version, output IDs; idempotent retries must not create a feedback loop.

## Integration requirements before live automation

- Shopify subscriptions and app admin token, webhook secret, and dedicated secure worker credentials (never in browser/theme).
- One server-side scheduled worker: choose Railway or Supabase, not both.
- Event dedupe, backoff, dead letter, per-field reconciliation receipts, version conflict queue, media manifest/backup pointers and explicit retention.
- Least-privilege RLS for any exposed new tables; no public security-definer write endpoints.
- Shadow-mode, full pagination tests, old-price protection, status/authorization gates and media QA before enabling outbound writes.
- CI checks and reviewed PR, then explicit production activation. No automatic merge or rollout.

## Verified current baseline (11 Oct 2026)

A current manual Shopify readback captured 145 products and 15 collections with all their product-level variants, media and metafields as immutable Supabase snapshots, with pagination inspected. Historical snapshots remain retained. The existing Shopify webhook event table was empty, the old bulk-import endpoint returned 410, and the queue had pending jobs. Complete automated synchronization is therefore NOT live.

## Tests

automation/catalog-sync/core.test.mjs validates HMAC, complete pagination, field version protection, Supabase canonical ownership, image rights/hash approvals and protected status changes. Do not deploy until the worker and production integration are implemented and independently exercised.