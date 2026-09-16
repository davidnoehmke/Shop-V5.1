alter table private.admin_bootstrap_config enable row level security;

revoke all on table private.admin_bootstrap_config from anon, authenticated;

comment on table private.admin_bootstrap_config is
  'Private owner-bootstrap configuration. Direct client access is denied; access is only through trusted SECURITY DEFINER functions.';
