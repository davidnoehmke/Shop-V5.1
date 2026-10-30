create index if not exists admin_bootstrap_config_consumed_by_idx
  on private.admin_bootstrap_config(consumed_by);

drop index if exists public.analytics_events_name_idx;
