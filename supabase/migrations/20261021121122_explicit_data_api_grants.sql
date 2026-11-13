-- Explicit API permissions for replay after Supabase's 2026-10-30 default change.
-- No data writes, RLS/policy changes, default grants, or SECURITY DEFINER changes.
begin;

-- Proven readers: storefront-assistant and leaf-control-api. Authoring workers
-- outside this repository need a separate reviewed contract before adding writes.
grant select on table public.content_atoms, public.content_atom_links to service_role;

-- Recreated readiness functions must not depend on inherited default EXECUTE.
revoke all on function public.evaluate_product_readiness(text) from public, anon, authenticated;
grant execute on function public.evaluate_product_readiness(text) to service_role;

-- Trigger invocation does not require EXECUTE for the row-writing role.
-- The migration owner creates the trigger; this helper is not a public RPC.
revoke all on function public.trg_queue_dirty_metafield() from public, anon, authenticated;

commit;
