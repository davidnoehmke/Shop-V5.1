create table if not exists public.public_portfolio_snapshot (
  key text primary key,
  title text not null,
  value_text text,
  description text not null default '',
  category text not null,
  sort_order integer not null default 100,
  is_published boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint public_portfolio_snapshot_key_safe check (key ~ '^[a-z0-9_-]+$'),
  constraint public_portfolio_snapshot_category_safe check (category in ('commerce','data','ai','engineering'))
);

alter table public.public_portfolio_snapshot enable row level security;

revoke all on table public.public_portfolio_snapshot from anon, authenticated;
grant select, insert, update, delete on table public.public_portfolio_snapshot to service_role;

comment on table public.public_portfolio_snapshot is
  'Backend-only allowlist for the public LEAFerservice Labs projection. Never store secrets, source code, prompts, internal identifiers, supplier economics, personal data, or security implementation details here.';

insert into public.public_portfolio_snapshot
  (key,title,value_text,description,category,sort_order,is_published)
values
  ('commerce-platform','Commerce Architecture','Live','Commerce workflows with a central data layer and controlled storefront projection.','commerce',10,true),
  ('data-analytics','Data & Analytics','Current','Aggregated commerce reporting designed for decision support and continuous improvement.','data',20,true),
  ('ai-automation','AI Agents & Automation','Controlled','Specialized AI-assisted workflows with validation and human approval for sensitive actions.','ai',30,true),
  ('ai-native-development','AI-native Development','Active','Voice-assisted, iterative development supported by automated validation and review workflows.','engineering',40,true)
on conflict (key) do update
set
  title = excluded.title,
  value_text = excluded.value_text,
  description = excluded.description,
  category = excluded.category,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published,
  updated_at = now();
