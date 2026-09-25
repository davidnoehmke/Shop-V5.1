create table if not exists public.content_atoms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  content_type text not null,
  icon_key text not null,
  one_liner text not null,
  short_explanation text,
  long_explanation text,
  aliases jsonb not null default '[]'::jsonb,
  seo_terms jsonb not null default '[]'::jsonb,
  shopify_metaobject_gid text unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_atoms_aliases_array check (jsonb_typeof(aliases) = 'array'),
  constraint content_atoms_seo_terms_array check (jsonb_typeof(seo_terms) = 'array')
);

create table if not exists public.content_atom_links (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null check (resource_type in ('product', 'collection')),
  resource_gid text not null,
  resource_handle text,
  atom_slug text not null references public.content_atoms(slug) on update cascade on delete cascade,
  context_role text not null default 'knowledge',
  display_priority integer not null default 100,
  created_at timestamptz not null default now(),
  unique(resource_type, resource_gid, atom_slug, context_role)
);

create index if not exists content_atom_links_resource_idx
  on public.content_atom_links(resource_type, resource_gid, display_priority);

alter table public.content_atoms enable row level security;
alter table public.content_atom_links enable row level security;

revoke all on table public.content_atoms from anon, authenticated;
revoke all on table public.content_atom_links from anon, authenticated;

insert into public.shopify_metafield_registry
(owner_type, namespace, key, name, data_type, domain, dynamic_role, source_of_truth, sync_direction, required_for_publish, storefront_visible, description, active)
values
('PRODUCT', 'leafer', 'knowledge_atoms', 'Wissensbausteine', 'list.metaobject_reference', 'knowledge', 'content', 'supabase', 'to_shopify', false, true, 'Mehrstufige wiederverwendbare Wissensbausteine für Produktseiten.', true),
('COLLECTION', 'leafer', 'knowledge_atoms', 'Wissensbausteine', 'list.metaobject_reference', 'knowledge', 'content', 'supabase', 'to_shopify', false, true, 'Mehrstufige wiederverwendbare Wissensbausteine für Collections.', true),
('COLLECTION', 'leafer', 'intro', 'Intro', 'multi_line_text_field', 'seo', 'content', 'supabase', 'to_shopify', false, true, 'Kurze Collection-Einleitung.', true),
('COLLECTION', 'leafer', 'guide', 'Praxiswissen', 'multi_line_text_field', 'seo', 'content', 'supabase', 'to_shopify', false, true, 'Ausführliches Collection-Praxiswissen.', true),
('COLLECTION', 'leafer', 'faq', 'FAQ strukturiert', 'json', 'seo', 'content', 'supabase', 'to_shopify', false, true, 'Collection-FAQ als JSON.', true),
('COLLECTION', 'leafer', 'keywords', 'Themenbegriffe', 'list.single_line_text_field', 'seo', 'taxonomy', 'supabase', 'to_shopify', false, true, 'Sichtbare Themenbegriffe und Synonyme.', true)
on conflict (owner_type, namespace, key) do update set
  name = excluded.name,
  data_type = excluded.data_type,
  domain = excluded.domain,
  dynamic_role = excluded.dynamic_role,
  source_of_truth = excluded.source_of_truth,
  sync_direction = excluded.sync_direction,
  storefront_visible = excluded.storefront_visible,
  description = excluded.description,
  active = true,
  updated_at = now();
