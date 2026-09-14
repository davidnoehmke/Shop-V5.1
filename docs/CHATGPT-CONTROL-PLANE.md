# LEAFerservice ChatGPT Control Plane

ChatGPT is the single human-facing input/output and approval surface for automated LEAFerservice operations. This does not mean ChatGPT stores infrastructure credentials. Credentials remain server-side in provider secret stores.

## Trust boundaries

1. ChatGPT receives intent, displays evidence/results and records explicit approvals.
2. Supabase is the operational SSOT and durable command/audit plane.
3. GitHub is the code/migration/theme source of truth. Pull requests and CI are mandatory validation surfaces.
4. Shopify is the commerce/publishing target. Production theme publication is never automatic.
5. Research agents are untrusted proposal producers: they may create pending candidates but cannot approve or publish them.

## Mandatory write path

User -> ChatGPT -> exact candidate/command -> validation -> explicit approval when required -> expiring control command -> CI/security gates -> target write -> verification -> immutable-style audit event -> ChatGPT result.

No research agent, scheduled job or storefront client may bypass this path for privileged writes.

## Security gates

- deny by default; least privilege
- service secrets never in theme/browser/repository/chat payloads
- RLS enabled; anon/authenticated revoked from backend-only tables
- idempotency key on commands
- unique approval token
- command expiration (default 30 minutes)
- exact target type + target ID binding
- explicit human confirmation for privileged operations
- immutable reviewed payload/candidate identity before sync
- CI required before deployment eligibility
- preview/staging before production
- production Shopify theme publish remains manual/explicit
- audit before/after state and result
- failures fail closed; never silently mark synced
- rollback is a separate explicit command
- security overrides are critical-risk and never implied by another approval

## Agent permissions

Research agents: read canonical data, research, score, propose, write pending_review only.
Review agents: read and validate; propose changes only.
Sync/deploy worker: execute only an unexpired validated command that is bound to the exact approved candidate and target.
ChatGPT: human-facing orchestrator and approval surface. It must not infer blanket approval from a prior approval.

## Production rule

A successful CI run means eligible for the next gate, not automatically safe to publish. Production publication requires explicit approval for the exact release and provider-side permission.