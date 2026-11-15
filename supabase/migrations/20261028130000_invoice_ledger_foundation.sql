-- LEAFerservice invoice ledger (staging schema, no live trigger).
-- Apply only after CI and accounting review; does not create invoices for historic orders.
create schema if not exists billing_private;
revoke all on schema billing_private from public, anon, authenticated;
grant usage on schema billing_private to service_role;

create table if not exists billing_private.invoice_counters (
  series text primary key,
  last_number bigint not null default 0 check (last_number >= 0)
);
create table if not exists billing_private.invoices (
  id uuid primary key default gen_random_uuid(),
  sales_channel text not null check (sales_channel in ('shopify','ebay')),
  source_order_id text not null,
  source_shop text not null default 'leaferservice.com',
  invoice_series text not null default 'LS',
  invoice_number text unique,
  issued_at timestamptz,
  currency char(3) not null default 'EUR',
  gross_total numeric(14,2) not null check(gross_total >= 0),
  customer_snapshot jsonb not null,
  line_items_snapshot jsonb not null,
  tax_note text not null default 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.',
  status text not null default 'pending' check(status in ('pending','issued','delivery_pending','delivered','delivery_failed','cancelled')),
  pdf_storage_path text unique,
  email_sent_at timestamptz,
  source_event_id text,
  created_at timestamptz not null default now(),
  unique(sales_channel, source_shop, source_order_id)
);
create table if not exists billing_private.invoice_events (
  id bigint generated always as identity primary key,
  invoice_id uuid references billing_private.invoices(id),
  source_event_id text unique,
  event_type text not null,
  event_payload jsonb,
  created_at timestamptz not null default now()
);
create table if not exists billing_private.invoice_adjustments (
  id uuid primary key default gen_random_uuid(),
  original_invoice_id uuid not null references billing_private.invoices(id),
  adjustment_number text unique,
  kind text not null check(kind in ('credit_note','correction')),
  amount numeric(14,2) not null,
  reason text not null,
  issued_at timestamptz,
  pdf_storage_path text,
  created_at timestamptz not null default now()
);
create index if not exists invoice_status_idx on billing_private.invoices(status, created_at);
create index if not exists invoice_order_idx on billing_private.invoices(source_order_id);
revoke all on all tables in schema billing_private from public, anon, authenticated;
grant select, insert, update on billing_private.invoices to service_role;
grant select, insert, update on billing_private.invoice_counters to service_role;
grant select, insert on billing_private.invoice_events to service_role;
grant select, insert, update on billing_private.invoice_adjustments to service_role;
grant usage, select on all sequences in schema billing_private to service_role;
-- Strict API isolation: schema billing_private must NOT be in exposed API schemas.
-- No customer mail or number assignment is performed by this migration.
