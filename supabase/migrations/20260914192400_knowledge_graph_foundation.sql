-- LEAFerservice Knowledge Graph foundation
create table if not exists public.knowledge_entities (
 id uuid primary key default gen_random_uuid(), entity_type text not null check (entity_type in ('product','material','plant','problem','application','collection','article','concept')), canonical_name text not null, slug text, shopify_gid text, shopify_handle text, aliases text[] not null default '{}', attributes jsonb not null default '{}'::jsonb, source_snapshot jsonb not null default '{}'::jsonb, status text not null default 'active' check (status in ('active','draft','deprecated')), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index if not exists knowledge_entities_shopify_gid_uq on public.knowledge_entities(shopify_gid) where shopify_gid is not null;
create unique index if not exists knowledge_entities_type_slug_uq on public.knowledge_entities(entity_type,slug) where slug is not null;
create index if not exists knowledge_entities_name_idx on public.knowledge_entities(lower(canonical_name));

create table if not exists public.knowledge_relations (
 id uuid primary key default gen_random_uuid(), subject_id uuid not null references public.knowledge_entities(id) on delete cascade, predicate text not null, object_id uuid not null references public.knowledge_entities(id) on delete cascade, confidence numeric(4,3) not null default 1 check (confidence between 0 and 1), evidence jsonb not null default '{}'::jsonb, status text not null default 'active' check (status in ('active','candidate','rejected')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(subject_id,predicate,object_id));
create index if not exists knowledge_relations_subject_idx on public.knowledge_relations(subject_id,predicate);
create index if not exists knowledge_relations_object_idx on public.knowledge_relations(object_id,predicate);

create table if not exists public.knowledge_qa (
 id uuid primary key default gen_random_uuid(), entity_id uuid references public.knowledge_entities(id) on delete cascade, question text not null, answer text not null, intent text, long_tail_keywords text[] not null default '{}', source_type text not null default 'shopify_existing', source_refs jsonb not null default '[]'::jsonb, factuality_score numeric(5,2), diversity_score numeric(5,2), ai_citation_score numeric(5,2), seo_score numeric(5,2), approval_status text not null default 'approved_existing' check (approval_status in ('approved_existing','pending_review','approved','rejected','deprecated')), published_surfaces text[] not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index if not exists knowledge_qa_entity_idx on public.knowledge_qa(entity_id,approval_status);
create index if not exists knowledge_qa_question_idx on public.knowledge_qa(lower(question));

create table if not exists public.knowledge_surface_rules (
 id uuid primary key default gen_random_uuid(), surface text not null check (surface in ('product','collection','article','configurator','homepage')), entity_type text not null, max_answers integer not null default 6 check (max_answers between 1 and 30), min_factuality_score numeric(5,2) not null default 70, min_ai_citation_score numeric(5,2) not null default 60, intents text[] not null default '{}', enabled boolean not null default true, unique(surface,entity_type));

alter table public.knowledge_entities enable row level security; alter table public.knowledge_relations enable row level security; alter table public.knowledge_qa enable row level security; alter table public.knowledge_surface_rules enable row level security;
revoke all on public.knowledge_entities,public.knowledge_relations,public.knowledge_qa,public.knowledge_surface_rules from anon,authenticated;
grant select,insert,update,delete on public.knowledge_entities,public.knowledge_relations,public.knowledge_qa,public.knowledge_surface_rules to service_role;

create or replace view public.knowledge_dynamic_answers with (security_invoker=true) as select q.id,q.entity_id,e.entity_type,e.canonical_name,e.shopify_gid,e.shopify_handle,q.question,q.answer,q.intent,q.long_tail_keywords,q.factuality_score,q.ai_citation_score,q.seo_score,q.published_surfaces from public.knowledge_qa q join public.knowledge_entities e on e.id=q.entity_id where q.approval_status in ('approved_existing','approved') and e.status='active';
revoke all on public.knowledge_dynamic_answers from anon,authenticated; grant select on public.knowledge_dynamic_answers to service_role;

create index if not exists content_approval_queue_article_idx on public.content_approval_queue(article_id);
create index if not exists content_articles_topic_idx on public.content_articles(topic_id);
create index if not exists content_runs_article_idx on public.content_runs(article_id);
create index if not exists content_runs_topic_idx on public.content_runs(topic_id);