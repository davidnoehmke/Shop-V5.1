# ChatGPT -> Codex -> GitHub -> Shopify

## Installation and operational status

This is the theme-code pipeline for `davidnoehmke/Shop-V5.1`. ChatGPT creates an explicitly authorized issue; GitHub performs the remaining work. Speech-to-text stays in the ChatGPT input. No separate dictation application or daily theme copy is needed.

The implementation is fail-closed. Source code and successful CI are NOT proof that OpenAI authentication, Shopify delivery or automatic merging have been activated. On 2026-09-15, the repository-level readiness run found no OpenAI key, GitHub automation credential, Shopify Theme Access token or store host available to this workflow. The connector's own authentication is not a reusable workflow credential.

Existing content-agent policy remains unchanged: Supabase stays the content SSOT, explicit content approval remains required, and automatic content publication remains disabled. This pipeline does not change product prices, orders, customer data, payments or legal policies.

## One-time owner setup

In repository Settings -> Secrets and variables -> Actions, configure these **repository secrets** (never paste them into an issue, source file or chat):

| Secret | Purpose |
|---|---|
| `OPENAI_API_KEY` | OpenAI API project credential used by Codex. API access and billing must work; a ChatGPT subscription alone is not a GitHub Actions credential. Set an appropriate project usage limit. |
| `SHOPIFY_CLI_THEME_TOKEN` | Shopify Theme Access credential for this store. Used only for unpublished staging uploads and read-back verification of live files. |
| `SHOPIFY_STORE` | Canonical `your-store.myshopify.com` host, without `https://` or a path. Do not substitute the public custom domain. |
| `LEAF_GITHUB_TOKEN` | Fine-grained automation token restricted to this repository, OR use the GitHub App configuration below. |

Preferred for durable automation: install a dedicated GitHub App on this repository, set the repository variable `LEAF_GITHUB_APP_ID`, and store its PEM private key as `LEAF_GITHUB_APP_PRIVATE_KEY`. A fresh short-lived installation token is minted in each trusted controller job. `LEAF_GITHUB_TOKEN`, when present, takes precedence. Rotate/revoke unused credentials.

Required GitHub App / fine-grained token permissions: Contents, Pull requests, Issues and Commit statuses **read/write**; Actions, Checks and Administration **read**. Administration read is used only to verify branch protection. No workflow editing, secret administration, organization administration or unrestricted account token is required by normal runs. The built-in `GITHUB_TOKEN` is not a fallback for opening generated PRs because that can prevent unattended downstream CI.

Set these repository variables:

| Variable | Value / requirement |
|---|---|
| `SHOPIFY_STAGING_THEME_ID` | A permanent **unpublished** preview theme. The existing audit target observed on 2026-09-15 was `190367662465` (`LEAF Content-UX Audit 15-09-2026`). Choose it only if it is to be reused and overwritten as the shared preview. |
| `SHOPIFY_LIVE_THEME_ID` | The expected MAIN theme. Observed on 2026-09-15: `190364942721`, named `Shop-V5.1/main`. Runtime role checks reject a changed MAIN destination. |
| `LEAF_NATIVE_SYNC_CONFIRMED` | `true` only after verifying in Shopify that the intended live theme really is connected to this repository's `main` branch. The theme name alone is not proof. |
| `LEAF_AUTOMATION_ENABLED` | Leave unset or `false` until the owner setup and acceptance checks below are complete. `true` authorizes normal code-request execution. |
| `LEAF_CODEX_MODEL` | Optional model override supported by the configured OpenAI project. Otherwise use the pinned Codex CLI default. |
| `LEAF_ALLOWED_USERS` | Optional comma-separated additional trusted issue authors. Default authorized owner: `davidnoehmke`. Never use `*`. |
| `LEAF_ALLOWED_BOTS` | Optional explicit trusted Codex-action bot callers, not an issue-author wildcard. Leave unset for the normal ChatGPT connector acting as David. |

The `shopify-preview` environment must permit this workflow and these branches. Required environment reviewers, approval-required app actions, account restrictions, disabled Actions or exhausted API budgets can still block execution; the pipeline does not bypass them.

## Mandatory branch protection

Protect `main` before enabling the pipeline. Require pull requests and up-to-date branches; apply protection to administrators as well; disallow force-pushes. The controller checks the classic branch-protection API and fails if it cannot verify these requirements. Rulesets alone are not a substitute for that check in this version; additional rulesets remain enforced by GitHub.

Required status contexts:

- `Repository validation`
- `Shopify Theme Check`
- `Theme structure`
- `Supabase migration validation`
- `Pipeline unit tests`
- `leaf/preview`

`leaf/preview` is written by the isolated merge controller only after exact-head CI and preview browser tests succeed. Configure that context through the GitHub protection API if the UI does not yet offer a context that has not run. Do NOT create a fake successful check to get around a required test.

For unattended code merging, the applicable rule cannot require a human approval count. Existing review requirements are never removed by this code: the owner must explicitly decide the appropriate policy. Do not weaken the separate content-agent approval contract. Additional signed-commit or merge-queue requirements may need a deliberate compatible setup; they are not bypassed.

The repository's general `allow_auto_merge` switch is not needed here: a deterministic REST merge is performed after gates, with an expected head SHA. Required branch checks and other GitHub protections still apply.

## Normal operation

ChatGPT creates an issue titled `[LEAF CODE] <specific requested change>`, with the authorized requirements and acceptance criteria in the body. The repository is public: do not put credentials, customer details or confidential business information into these requests.

The workflow verifies the author, open state, prefix, configuration and protections. It records a digest of the request and the current `main` SHA. Codex runs on a separate read-only, sudo-restricted runner with no GitHub-write or Shopify credential. Its final structured output is validated in a fresh trusted job.

The controller accepts only 1-12 complete UTF-8 theme text files, at most 64 KB total. No file deletions, binary files, symlinks, path traversal, case collisions, credential-shaped output, pipeline files, Supabase code or `config/settings_data.json` are accepted. `assets/leaf-release.json` is reserved for controller-generated release metadata. Larger changes must be split into smaller explicit requests. Generated code cannot replace its own controller or tests.

A branch, commit and PR are created automatically. The workflow waits for real PR-triggered LEAF CI on that exact head, uploads to the existing unpublished preview, and runs Chromium checks at 390px and 1440px: expected theme ID, rendered pages, configurator slider, a purchasable product form and add-to-cart. These are smoke tests, not a complete UX/accessibility/SEO audit. Each browser has fresh cookies; only its disposable cart is cleared. Checkout is never opened or submitted.

Only then is the tested PR merged. Native Shopify GitHub synchronization is the sole live writer. This automation never calls theme publish or pushes with `--allow-live`. A separate job reads the release marker AND every proposed file from the MAIN theme and compares contents, then runs the browser smoke checks against live. An issue is closed only after this last check succeeds. A merged PR alone is not reported as a verified live release.

Manual staging and normal code requests use coordinated concurrency locks. Up to 100 pending requests are retained by GitHub's `queue: max`; beyond the platform limit, requests can be canceled and must be inspected/retried. A moving base or edited/closed request stops the run instead of silently overwriting newer work. Do not edit the shared preview manually during a release.

## Acceptance checks before calling the system operational

1. Merge the infrastructure only after LEAF CI and readiness diagnostics are understood. Run a harmless `[LEAF CODE]` intake test while automation remains disabled; verify that it receives a status comment and creates no generated PR or theme write.
2. Configure the credentials, permanent theme IDs and protections. Confirm the native Shopify GitHub branch connection in Shopify. Run the manual staging workflow with an exact known commit and inspect the preview. The workflow checks actual roles before upload and never accepts MAIN as staging.
3. Enable `LEAF_AUTOMATION_ENABLED` only for an explicitly approved small theme-code acceptance request. Verify every job including `delivery-check` and `live-check`, not just CI. Until this authenticated end-to-end test succeeds, operation is unverified.

No authenticated Codex generation, staging upload, automatic code merge or live browser success should be claimed solely from the infrastructure unit tests.

## Diagnostics and recovery

All runs have GitHub step summaries and an outcome comment on the originating issue. Optional Supabase telemetry is not allowed to turn a failed deployment into success or a successful upload into a fabricated failure. Without its credentials, the GitHub log remains available. Telemetry uses the checked-out commit, not the unrelated triggering workflow SHA, and never invents passed checks.

The pinned actionlint 1.7.12 release predates GitHub's documented `concurrency.queue` property. `.github/actionlint.yaml` filters only that exact unknown-key diagnostic in the two delivery workflows. Other lint diagnostics remain blocking. Both use literal `queue: max` with `cancel-in-progress: false`. Remove the narrow compatibility exceptions when upgrading to a linter release supporting the native property.

Set `LEAF_AUTOMATION_ENABLED=false` to stop **new** code work, and cancel any already-running workflow separately when an emergency stop is required. If a run fails after a merge, stop further changes and inspect the live state. This version intentionally does not claim or attempt an automatic rollback. Recovery is a reviewed corrective/revert PR tested against the currently deployed version; do not force-push main or bypass checks.

An edited request or advanced base is retried through the workflow's manual `issue_number` input or a new explicit ChatGPT request. A retry creates its own branch; old failed PRs are not overwritten. Automatic unbounded repair loops are deliberately absent.

## Primary references

- https://developers.openai.com/codex/github-action/
- https://github.com/openai/codex-action
- https://docs.github.com/en/actions/concepts/security/github_token
- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#concurrency
- https://shopify.dev/docs/storefronts/themes/tools/github
- https://shopify.dev/docs/api/shopify-cli/theme/theme-push
