-- Keep API access read-only under both strict and legacy default ACLs.
revoke all privileges on public.ecosystem_public_regions, public.ecosystem_public_hotspots
  from public, anon, authenticated;
grant select on public.ecosystem_public_regions, public.ecosystem_public_hotspots
  to anon, authenticated;
