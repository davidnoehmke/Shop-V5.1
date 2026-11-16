# Plant photo analysis v2

Status: implemented for an authenticated pilot, not benchmarked as a diagnostic system.
Entry: `/portal/photo-analysis` (DE) or `/portal/photo-analysis?lang=en` (EN).
The repository currently uses React Router / Hydrogen 2026.4 with React and TypeScript,
not the Vue architecture assumed in older planning notes. Existing Supabase server auth
and the portal sign-in are reused; no second identity system is added.

## Implemented

- One to three local photo previews, JPEG/PNG/WebP input up to 8 MiB and 25 MP;
  browser normalization to JPEG at most 1600 px. HEIC/HEIF gets explicit export guidance.
- Verified Supabase user in both the protected route and API; same-origin POST, secure
  HttpOnly auth cookies, no public caching, and no browser provider credentials.
- Independent server JPEG decoding with `jpeg-js@0.4.4`, dimension/memory limits,
  strict corruption handling and metadata-free re-encoding before provider access.
- Real OpenAI Responses API image input, strict JSON schema, no provider response
  persistence requested (`store:false`), bounded provider output and timeout handling.
- Separate visual observations, identification candidates, tentative categorized causes,
  distinguishing next checks, care recommendations and uncertainty.
- Structured light, substrate moisture, drainage and duration information. Follow-up
  answers resubmit the original images and context, with explicit quota disclosure.
- Atomic database-backed limits via existing service-only RPC: two attempts/user/10 min
  and ten total/hour for the pilot. No automatic paid retry. Invalid decoded images can
  consume an attempt, but never reach the provider. This is a request cap, not a euro or
  monthly budget ledger.
- Shopify products fetched server-side only when the user explicitly reports low light
  and the model also finds a plausible light-related cause in sufficient images.
  At most three available plant-light products; actual titles, photos and starting prices
  from Storefront, links to normal variant selection. No automatic pesticide or irrigation
  upsell. Catalog failure does not discard the care result.
- Data-image CSP exception scoped to the private photo route; script sources unchanged.
- Discard removes the current browser images/result. No image bucket, database case
  history or photo archive is created by this version. Provider retention is separate.

## Deployment and configuration

`supabase/functions/plant-photo-analysis-v2` is a new versioned function. The old
`plant-photo-analysis` function and implementation are retained for deployed v1 clients.
The new headless proxy calls `/functions/v1/plant-photo-analysis-v2`. Both functions
perform their own `auth.getUser(token)` verification, so gateway JWT verification is
intentionally disabled for asymmetric signing-key compatibility, not for public access.

Server prerequisites:

- `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in the headless environment.
- Supabase's server-side secret/service key available to the Edge Function.
- `OPENAI_API_KEY` configured in Edge Function secrets, or supplied by the existing
  service-only `leaf_read_server_secret('OPENAI_API_KEY')` vault path.
- Optional `PLANT_PHOTO_MODEL` must be a vision model supporting strict structured output.
- Existing `consume_storefront_assistant_rate_limit` RPC restricted to service_role.
- Existing verified portal user; this change does not enable public registration.

The repository's `Assistant model credential sync` workflow transfers its configured
GitHub `OPENAI_API_KEY` secret to that vault after successful main-branch CI. It never logs
values. Do not paste keys into PRs, chat, test fixtures, browser forms, or client variables.
Presence checks return booleans only. During implementation the named vault-presence
check returned false; a direct Edge Function secret may exist independently and is not
proven by that check. Successful paid image inference still requires an authenticated
real-provider smoke test. Missing credentials return 503, never a fake report.

Do not turn on the Shopify Liquid `leaf_photo_portal_enabled` setting until the deployed
portal, actual inference and privacy notices have been checked together. Keep the existing
portal URL setting pointed at the verified deployment; do not publish a new theme for this.

## Verification and release gates

Run `npm run codegen`, `npm run typecheck`, `npm test`, `npm run build:vercel` in headless,
and `node --test automation/codex/storefront-regressions.test.cjs` from the repository root.
The tests cover authorization, malformed/oversized requests, real JPEG decoding, metadata
removal, provider payload/schema/errors, conservative product rules and the CSP exception.
Provider calls are mocked in automated tests: this proves the integration contract, not
botanical accuracy or an active API subscription.

Before live enablement, sign in on the deployed preview, upload one rights-cleared plant
photo, verify an actual report, answer a follow-up, discard, and test DE/EN on mobile and
desktop. Confirm unauthorized requests fail, provider failures are understandable and
product links reach actual variants. Record commit, URL, device and test evidence.

The local Chromium runner could not launch because the environment denied its process
singleton socket. The cloud browser could not reach the local harness. Consequently no
visual mobile/desktop or authenticated real-provider end-to-end pass is claimed.

## Planned separately

Specialist-provider comparison and calibrated quality benchmark, expert-reviewed care
knowledge retrieval, durable job queue/resumption, private persisted history with RLS,
retention/deletion workers, monthly euro budget ledger and provider contract review remain
planned work. This pilot does not claim these enterprise release gates are complete.
See the planning Page “Leaferservice – Enterprise-Pflanzenanalyse”.
