# ChatGPT Approval / Sync Protocol

This protocol applies when the user explicitly approves a displayed candidate.

1. Resolve the candidate by exact `id` and `approval_token`. Never infer approval for another row.
2. Re-read its current Supabase state.
3. Require `status=pending_review` for a new approval and preserve the reviewed payload snapshot.
4. Record `reviewed_by=chatgpt_user`, `reviewed_at`, and the user's approval note if present; transition to `approved`, then `sync_ready` only for the same immutable candidate snapshot.
5. Immediately before any external write, re-read the row and require `status=sync_ready`.
6. Prepare the smallest target change. Theme code belongs in GitHub. Commerce/content records belong in Shopify, with Supabase retaining canonical operational/research state.
7. Do not publish a Shopify theme automatically. Theme publication remains a separate explicit Shopify Admin action where connector policy blocks publishing.
8. Verify the target write. Only then record `commit_sha`, target identifiers in `sync_payload`, `synced_at`, and `status=synced`.
9. On any failure, set `status=failed` with a non-secret diagnostic; never silently mark synced.
10. A rejection sets `status=rejected`; rejected candidates cannot sync without a new research/review cycle.

Approval is per candidate, not a blanket authorization for future candidates.
