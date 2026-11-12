create table if not exists public.storefront_assistant_rate_limits (
  fingerprint text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (fingerprint, window_started_at)
);

alter table public.storefront_assistant_rate_limits enable row level security;
revoke all on table public.storefront_assistant_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.storefront_assistant_rate_limits to service_role;

create or replace function public.consume_storefront_assistant_rate_limit(
  p_fingerprint text,
  p_limit integer default 10,
  p_window_seconds integer default 60
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
declare
  v_window timestamptz;
  v_count integer;
begin
  if p_fingerprint is null or length(p_fingerprint) < 8 then return false; end if;
  if p_limit < 1 or p_limit > 100 or p_window_seconds < 10 or p_window_seconds > 3600 then return false; end if;

  v_window := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds);

  insert into public.storefront_assistant_rate_limits (fingerprint,window_started_at,request_count,updated_at)
  values (p_fingerprint,v_window,1,now())
  on conflict (fingerprint,window_started_at)
  do update set request_count = public.storefront_assistant_rate_limits.request_count + 1, updated_at = now()
  returning request_count into v_count;

  if random() < 0.02 then
    delete from public.storefront_assistant_rate_limits where window_started_at < now() - interval '24 hours';
  end if;

  return v_count <= p_limit;
end;
$function$;

revoke all on function public.consume_storefront_assistant_rate_limit(text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_storefront_assistant_rate_limit(text,integer,integer) to service_role;
