# Plant photo analysis

The authenticated Hydrogen portal offers `/portal/photo-analysis` (German) and
`/portal/photo-analysis?lang=en` (English). The portal landing page and LEAF chat
panel link to it. It uses the Supabase Auth integration from PR #287. It does not
replace Shopify customer accounts or publish new Liquid theme sections.

## Implemented behavior

- Two goals: identify a plant or explore visible problems.
- Camera/gallery input, up to three JPEG/PNG/WebP originals at 8 MB each.
- Browser decoding, orientation, resize to 1600 px and JPEG re-encoding. Originals
  and EXIF/GPS metadata are not transmitted. Unsupported/corrupt files and extreme
  dimensions are rejected. The server validates JPEG markers and frame dimensions.
- Explicit consent before uploading to OpenAI. No photo archive, browser storage,
  database image records or image/context logs. OpenAI requests use `store: false`;
  this does not promise zero provider retention. Visible personal information
  inside a photograph is not removed by metadata stripping.
- Authenticated same-origin API; independent token verification in the Edge
  Function; anonymous Auth users denied. User IDs come from Auth, not the payload.
- Persistent atomic quota: five model attempts per user per ten-minute fixed
  window, using the existing `consume_storefront_assistant_rate_limit` RPC with
  a separate `plant-photo:` namespace. Database errors fail closed. No schema or
  authorization grants are added.
- Both servers bound streamed JSON input at 3,300,000 bytes. Model timeout 40 s,
  proxy timeout 50 s, UI timeout 55 s and user cancellation.
- Strict structured output plus independent runtime validation. Result sections:
  image quality, possible plants and evidence, visible observations, ranked
  possible causes, distinguishing checks, low-risk next steps, follow-up
  questions and limitations. Confidence labels are qualitative model assessments,
  not calibrated probabilities. No product recommendation is inserted.
- Unusable/non-plant images must not return identification/causes; limited images
  cannot return high confidence. Invalid/refused/incomplete model output fails
  without a fabricated fallback. User-facing errors distinguish login, quota and
  timeout issues. Every response has a trace ID and no-store headers.

## Runtime

Supabase project: `vbqimcwaxcydegqlkkgw` (LEAFerservice-SSOT).
New Edge Function: `plant-photo-analysis`, deployed version 1.
Its source is in `supabase/functions/plant-photo-analysis/`.

`verify_jwt=false` is deliberate: the handler independently calls `auth.getUser`
for every POST and rejects absent/invalid/anonymous users. No public analysis
path exists. This supports projects using asymmetric JWT signing keys. The
service key is used only internally to validate Auth and call the rate/secret
RPCs; it is never sent to the frontend. No CORS access is enabled: the browser
calls the same-origin Hydrogen proxy.

The function reuses the existing assistant's `OPENAI_API_KEY` secret, falling back
to the existing server-only secret RPC. Model selection uses `PLANT_PHOTO_MODEL`,
then `OPENAI_MODEL`, then the existing assistant default `gpt-4.1-mini`. No new
provider subscription or model key was created. API usage uses the existing
provider account. Supabase's SDK is pinned at 2.119.0.

The Hydrogen app needs server runtime `SUPABASE_URL` and
`SUPABASE_PUBLISHABLE_KEY`. The connected Vercel project's variable metadata
shows both configured for Preview and Production; value validity and deployment
read-back remain separate checks. Do not expose a service/secret key.

## Activation blocker verified on 2026-11-16

The existing assistant returned HTTP 200 with `mode: approved_context` and
`capabilities.image_analysis: false` on a minimal text probe. The existing
server-secret lookup also reported no configured OpenAI key (boolean-only check;
no secret value was retrieved). This establishes that the shared model credential
is currently unavailable. Add a valid `OPENAI_API_KEY` in this project's Edge
Function secrets before claiming real analysis works. The new endpoint returns
503 when that credential is absent; it never substitutes a text-only result.
A ChatGPT subscription does not itself provide this API credential.

## Evidence and release checks

Verified locally: 57 Node tests pass, TypeScript check, targeted ESLint (no errors),
Vercel build and Node adapter smoke check. Ten new tests exercise authentication,
anonymous rejection, consent/input validation, byte limits, JPEG markers and
bounds, quota failures, missing model credentials, result schemas, unusable images,
provider timeouts and redacted logging. These use a mocked model and do not
measure recognition accuracy.

Verified on the deployed Edge Function: GET -> 405; POST without credentials ->
401; POST with an invalid token -> 401. All responses include private/no-store
and trace IDs. Deployment succeeded and the new function serves these checks.
The existing chat/voice Edge Function was not replaced.

Still open: real authenticated photo analysis, provider structured-output
compatibility for the configured model, and browser/mobile visual acceptance.
Local Chromium launch was blocked by the runtime's socket permissions; no visual
QA pass is claimed. Standalone Deno checking could not fetch the JSR type package;
the platform deployment and live access checks did succeed.

Before release, use a real account and consented sample set: common recognizable
plant, ambiguous cultivar, healthy leaf, watering-like symptoms, possible pest
signs, blurry photo, dark photo, non-plant scene and rotated phone photo. Check
that uncertainty is justified and no chemical treatment/edibility assurance is
invented. Compare candidates and advice with a qualified reviewer; measure
identification accuracy before advertising an accuracy rate or diagnostic claim.
Test camera/gallery on iOS and Android, DE/EN, keyboard and screen reader, 390 px
and desktop, upload limits, cancellation, quota exhaustion, expired login and
logout. Confirm no image/context appears in logs or database storage. Merge and
verify the reviewed storefront version before calling the full feature live.

References: [OpenAI vision](https://developers.openai.com/api/docs/guides/images-vision),
[structured output](https://developers.openai.com/api/docs/guides/structured-outputs),
[Supabase Auth headers](https://supabase.com/docs/guides/functions/auth-headers).

## Shopify theme integration (opt-in)

`snippets/leaf-shop-assistant.liquid` exposes a link to the authenticated Hydrogen photo-analysis portal through the Shopify theme settings in `config/settings_schema.json`. The link appears in the desktop assistant actions and in the assistant's suggestion row only when **LEAF Pflanzenfotoanalyse > Fotoanalyse im LEAF-Assistenten anzeigen** is enabled and an HTTPS portal URL is configured. It preserves the English locale with `lang=en`, opens in a separate tab, and does not transmit any image, token or Shopify customer data from Liquid. The existing inactive photo-upload controls in the Shopify chat remain disabled. The Shopify customer login does not authenticate the separate Supabase portal.

**Do not enable the Shopify setting until** `OPENAI_API_KEY` is configured in the Supabase Edge Function, real authenticated photo analysis has passed, and the configured HTTPS portal URL and DE/EN mobile browser path have been verified. The default is off to prevent a misleading public photo-analysis offer. GitHub `main` contains the feature code but does not alone confirm that the live Shopify theme has received or enabled it.
