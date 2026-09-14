-- LEAFerservice human-in-the-loop content approval gate
-- Mirrors the production Supabase approval queue and keeps schema versioned in GitHub.

create extension if not exists pgcrypto;

create table if not exists public.content_approval_queue (
  id uuid primary key default gen_random_uuid(),
  candidate_type text not null check (candidate_type in ('blog_article','product','seo_ux_change')),
  article_id uuid references public.content_articles(id) on delete set null,
  product_payload jsonb not null default '{}'::jsonb,
  research_payload jsonb not null default '{}'::jsonb,
  validation_payload jsonb not null default '{}'::jsonb,
  diversity_payload jsonb not null default '{}'::jsonb,
  target_system text not null default 'shopify',
  target_repository text not null default 'davidnoehmke/Shop-V5.1',
  target_branch text not null default 'main',
  status text not null default 'pending_review'
    check (status in ('pending_review','approved','rejected','sync_ready','syncing','synced','failed')),
  approval_token uuid not null default gen_random_uuid(),
  reviewed_by text,
  reviewed_at timestamptz,
  approval_note text,
  sync_payload jsonb not null default '{}'::jsonb,
  commit_sha text,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (approval_token)
);

create index if not exists content_approval_queue_status_created_idx
  on public.content_approval_queue(status, created_at desc);
create index if not exists content_approval_queue_type_status_idx
  on public.content_approval_queue(candidate_type, status);

alter table public.content_approval_queue enable row level security;
revoke all on table public.content_approval_queue from anon, authenticated;
grant select, insert, update, delete on table public.content_approval_queue to service_role;

comment on table public.content_approval_queue is
  'Backend-only queue. Deep Research writes candidates; explicit human approval in ChatGPT is required before sync/commit.';
