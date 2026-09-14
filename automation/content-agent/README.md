# LEAF Content Approval Agent

This directory defines the contract between Deep Research, Supabase, ChatGPT approval, GitHub and Shopify.

## Non-negotiable rule

No researched blog article, product or SEO/UX change is allowed to reach Shopify or `main` without an explicit human approval in ChatGPT for the exact candidate/approval token.

## Flow

```text
Deep Research
  -> fact/source validation
  -> diversity + cannibalization check
  -> Supabase content pipeline
  -> content_approval_queue: pending_review
  -> ChatGPT review card
  -> explicit user decision
       reject -> rejected
       approve -> approved -> sync_ready
  -> prepare GitHub/Shopify change
  -> record commit_sha / sync result
  -> synced
```

## Cadence

- Daily: exactly one blog candidate.
- Daily: exactly one product candidate.
- Every two days: SEO/UX review of approved/synced content and its Shopify integration.
- SEO/UX review also creates a candidate and requires approval. It never edits production automatically.

The ChatGPT scheduler owns the cadence. GitHub stores the durable workflow contract and implementation assets; it must not contain ChatGPT automation IDs or credentials.

## Validation gates

A candidate should not be offered as ready when required evidence is missing. Validation covers:

1. factual/source validity and explicit uncertainty,
2. search intent and topical relevance,
3. duplication and keyword/content cannibalization,
4. diversity across intent, plant/product group, application and price band where applicable,
5. internal linking and Blog <-> Product <-> Configurator relations,
6. SEO metadata, headings, FAQ/schema and structured data,
7. mobile UX, information order and conversion path,
8. for products: plausible procurement cost and at least 25% gross margin on net selling price.

## Approval semantics

`pending_review` means research is complete enough to inspect, not that it is publishable.

`approved` records the human decision. The sync worker/agent may then move the exact candidate to `sync_ready`.

`sync_ready` is the only state from which a GitHub/Shopify write may start.

`synced` is only set after the target write is verified and its commit SHA / target identifiers are recorded.

## Secrets

Never commit Supabase secret/service keys, Shopify Admin tokens, GitHub tokens or ChatGPT credentials. Server-side integrations use environment/secret storage only. Public browser code must never receive a Supabase secret key.
