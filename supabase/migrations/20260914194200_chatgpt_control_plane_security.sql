-- ChatGPT is the human-facing control plane; backend credentials remain server-side.
create schema if not exists ops;

create table if not exists ops.control_commands (
  id uuid primary key default gen_random_uuid(),
  command_type text not null check (command_type in ('approve','reject','sync','deploy_preview','publish_request','rollback_request','security_override')),
  target_type text not null,
  target_id text not null,
  approval_token uuid not null default gen_random_uuid(),
  requested_by text not null default 'chatgpt_agent' check (requested_by = 'chatgpt_agent'),
  requested_payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','validated','executing','succeeded','rejected','failed','expired')),
  risk_level text not null default 'medium' check (risk_level in ('low','medium','high','critical')),
  requires_human_confirmation boolean not null default true,
  confirmed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  idempotency_key text not null,
  result_payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(idempotency_key), unique(approval_token)
);

create table if not exists ops.control_audit_log (
  id bigint generated always as identity primary key,
  command_id uuid references ops.control_commands(id) on delete set null,
  event_type text not null, actor text not null, target_type text, target_id text,
  before_state jsonb, after_state jsonb, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists control_commands_status_created_idx on ops.control_commands(status, created_at desc);
create index if not exists control_commands_target_idx on ops.control_commands(target_type, target_id);
create index if not exists control_audit_command_idx on ops.control_audit_log(command_id, created_at desc);

alter table ops.control_commands enable row level security;
alter table ops.control_audit_log enable row level security;
revoke all on schema ops from public, anon, authenticated;
revoke all on all tables in schema ops from public, anon, authenticated;
grant usage on schema ops to service_role;
revoke all on ops.control_commands from service_role;
revoke all on ops.control_audit_log from service_role;
grant select, insert, update on ops.control_commands to service_role;
grant select, insert on ops.control_audit_log to service_role;

alter default privileges for role postgres in schema public revoke select, insert, update, delete on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;
alter default privileges for role postgres in schema public revoke usage, select on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public;
alter default privileges for role postgres in schema ops revoke select, insert, update, delete on tables from public, anon, authenticated;
alter default privileges for role postgres in schema ops revoke execute on functions from public, anon, authenticated;
