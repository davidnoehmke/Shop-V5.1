# Automation runtime contract

The LEAF workflows fail closed. Repository access in ChatGPT or another GitHub client does not populate GitHub Actions secrets or variables. Configure the following under **Repository settings → Secrets and variables → Actions** before enabling execution.

Runtime stores are separate. A successful GitHub connector write proves repository access only; it does not make OpenAI, Shopify, or GitHub writer credentials available inside a GitHub Actions runner.

## Secrets

| Name | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Model generation in the isolated `generate` job |
| `SHOPIFY_STORE` | Canonical `*.myshopify.com` store hostname |
| `SHOPIFY_CLI_THEME_TOKEN` | Theme Access token used only by staging delivery and live read-back |
| `LEAF_GITHUB_TOKEN` | Scoped bot token for PR creation and CI orchestration |
| `LEAF_GITHUB_APP_PRIVATE_KEY` | Alternative to `LEAF_GITHUB_TOKEN`; requires `LEAF_GITHUB_APP_ID` |
| `SUPABASE_URL` | Optional deployment telemetry; required by the separately hosted content-agent worker |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional deployment telemetry; required by the separately hosted content-agent worker |

Use either the scoped bot token or the GitHub App pair, not both. The dedicated writer is intentional: pull requests created by the built-in `GITHUB_TOKEN` do not start the required pull-request workflow.

The content-agent scheduler/worker must receive OpenAI, Supabase, Shopify, and GitHub credentials in its own runtime secret store. Do not copy those values into prompts, issues, repository variables, or committed files.

## Capability boundaries

| Job | Minimum runtime capability | Permitted result before approval |
| --- | --- | --- |
| Research / blog / product preparation | OpenAI plus Supabase write access | `pending_review` candidate only |
| Code review | GitHub read access | Findings or proposed patch only |
| GitHub sync | Scoped writer plus exact `sync_ready` candidate | Branch or pull request; never direct uncontrolled publication |
| Shopify sync | Shopify credential plus exact `sync_ready` candidate | Verified target write; theme upload remains unpublished |

## Variables

| Name | Safe setup value | Purpose |
| --- | --- | --- |
| `LEAF_AUTOMATION_ENABLED` | `false` | Global execution gate; keep false until the dry run is clean |
| `LEAF_NATIVE_SYNC_CONFIRMED` | `false` | Keep false until main-to-live behavior has been independently verified |
| `LEAF_GITHUB_APP_ID` | unset unless using an App | GitHub App identifier |
| `SHOPIFY_STAGING_THEME_ID` | unpublished theme ID | Upload destination |
| `SHOPIFY_LIVE_THEME_ID` | current live theme ID | Read-back target; must differ from staging |
| `LEAF_CODEX_MODEL` | approved Codex model | Pinned generation model |
| `LEAF_ALLOWED_USERS` | empty | Optional comma-separated additional request authors; wildcard is forbidden |
| `LEAF_ALLOWED_BOTS` | empty | Optional explicit bot allowlist |

## Safe verification order

1. Add the secrets and variables while both safety variables remain `false`.
2. Run **LEAF Code Request** manually with `dry_run=true` and no issue number.
3. Confirm the summary reports every required value as configured and explicitly says that no external write was attempted.
4. Verify the staging theme is unpublished and distinct from the live theme.
5. Set `LEAF_NATIVE_SYNC_CONFIRMED=true` only after that verification.
6. Set `LEAF_AUTOMATION_ENABLED=true` only when real issue-driven execution is desired.

The staging delivery command omits Shopify CLI `--publish` and `--allow-live`. Content-agent candidates must remain `pending_review` until an exact candidate and approval token receive explicit human approval; only `sync_ready` candidates may enter a write path.
