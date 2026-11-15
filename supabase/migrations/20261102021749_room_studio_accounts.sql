-- LEAF Room Studio: anonymous/personalized project ownership and private room photos.
-- Additive and backwards-compatible with legacy resume-code projects.

alter table public.configurator_projects
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists project_kind text not null default 'advisor',
  add column if not exists title text,
  add column if not exists schema_version integer not null default 1,
  add column if not exists locale text,
  add column if not exists room_geometry jsonb not null default '{}'::jsonb,
  add column if not exists room_objects jsonb not null default '[]'::jsonb,
  add column if not exists room_products jsonb not null default '[]'::jsonb,
  add column if not exists room_measurement jsonb not null default '{}'::jsonb,
  add column if not exists room_photo_path text,
  add column if not exists room_photo_consent_at timestamptz,
  add column if not exists preferences jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'configurator_projects_project_kind_check'
      and conrelid = 'public.configurator_projects'::regclass
  ) then
    alter table public.configurator_projects
      add constraint configurator_projects_project_kind_check
      check (project_kind in ('advisor','substrate','room','lighting','watering','planter'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'configurator_projects_schema_version_check'
      and conrelid = 'public.configurator_projects'::regclass
  ) then
    alter table public.configurator_projects
      add constraint configurator_projects_schema_version_check
      check (schema_version between 1 and 20);
  end if;
end $$;

create index if not exists configurator_projects_owner_kind_updated_idx
  on public.configurator_projects (owner_user_id, project_kind, updated_at desc)
  where owner_user_id is not null;

create table if not exists public.leaf_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  profile_mode text not null default 'anonymous',
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leaf_profiles_display_name_length check (display_name is null or char_length(display_name) <= 80),
  constraint leaf_profiles_mode_check check (profile_mode in ('anonymous','pseudonymous','personalized'))
);

alter table public.configurator_projects enable row level security;
alter table public.leaf_profiles enable row level security;

drop policy if exists "configurator_projects_owner_select" on public.configurator_projects;
create policy "configurator_projects_owner_select"
  on public.configurator_projects for select
  to authenticated
  using ((select auth.uid()) = owner_user_id);

drop policy if exists "configurator_projects_owner_insert" on public.configurator_projects;
create policy "configurator_projects_owner_insert"
  on public.configurator_projects for insert
  to authenticated
  with check ((select auth.uid()) = owner_user_id);

drop policy if exists "configurator_projects_owner_update" on public.configurator_projects;
create policy "configurator_projects_owner_update"
  on public.configurator_projects for update
  to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);

drop policy if exists "configurator_projects_owner_delete" on public.configurator_projects;
create policy "configurator_projects_owner_delete"
  on public.configurator_projects for delete
  to authenticated
  using ((select auth.uid()) = owner_user_id);

drop policy if exists "leaf_profiles_owner_select" on public.leaf_profiles;
create policy "leaf_profiles_owner_select"
  on public.leaf_profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "leaf_profiles_owner_insert" on public.leaf_profiles;
create policy "leaf_profiles_owner_insert"
  on public.leaf_profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "leaf_profiles_owner_update" on public.leaf_profiles;
create policy "leaf_profiles_owner_update"
  on public.leaf_profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "leaf_profiles_owner_delete" on public.leaf_profiles;
create policy "leaf_profiles_owner_delete"
  on public.leaf_profiles for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Data API access is explicit since Supabase stopped auto-exposing new public tables.
revoke all on table public.leaf_profiles from anon;
grant select, insert, update, delete on table public.leaf_profiles to authenticated;
grant select, insert, update, delete on table public.configurator_projects to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'leaf-room-projects',
  'leaf-room-projects',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "leaf_room_photos_select_own" on storage.objects;
create policy "leaf_room_photos_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'leaf-room-projects'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "leaf_room_photos_insert_own" on storage.objects;
create policy "leaf_room_photos_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'leaf-room-projects'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "leaf_room_photos_update_own" on storage.objects;
create policy "leaf_room_photos_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'leaf-room-projects'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'leaf-room-projects'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "leaf_room_photos_delete_own" on storage.objects;
create policy "leaf_room_photos_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'leaf-room-projects'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
