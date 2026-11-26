import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { statements } from './sql.mjs';

const root = new URL('../../', import.meta.url);
const migrationDir = new URL('supabase/migrations/', root);
const migrations = readdirSync(migrationDir).filter(p => p.endsWith('.sql')).sort()
  .map(path => ({ path, sql: readFileSync(new URL(path, migrationDir), 'utf8') }));
const correction = migrations.find(m => m.path.endsWith('_explicit_data_api_grants.sql'));
const tables = {
  'public.content_approval_queue': ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  'public.knowledge_entities': ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  'public.knowledge_relations': ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  'public.knowledge_qa': ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  'public.knowledge_surface_rules': ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  'ops.control_commands': ['SELECT', 'INSERT', 'UPDATE'],
  'ops.control_audit_log': ['SELECT', 'INSERT'],
  'public.content_atoms': ['SELECT'],
  'public.content_atom_links': ['SELECT'],
  'public.public_portfolio_snapshot': ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  'public.shopify_collection_metafield_state': ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  'public.storefront_assistant_rate_limits': ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
};
const tablePrivileges = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN'];
// Later migrations intentionally use different access models. These contracts
// assert their explicit grants under strict defaults, not inferred production ACLs.
const additionalTables = {
  // 20261028130000_invoice_ledger_foundation.sql: private, unexposed schema;
  // browser roles have neither schema USAGE nor table privileges. No RLS declared.
  'billing_private.invoice_counters': { rls: false, service_role: ['SELECT', 'INSERT', 'UPDATE'] },
  'billing_private.invoices': { rls: false, service_role: ['SELECT', 'INSERT', 'UPDATE'] },
  'billing_private.invoice_events': { rls: false, service_role: ['SELECT', 'INSERT'] },
  'billing_private.invoice_adjustments': { rls: false, service_role: ['SELECT', 'INSERT', 'UPDATE'] },
  // 20261102021749_room_studio_accounts.sql: authenticated owner policies;
  // no new service_role grant is declared in this migration.
  'public.leaf_profiles': { rls: true, authenticated: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] },
  // 20261126010126_add_leaf_grow_calendar_crops.sql and
  // 20261126012102_restrict_grow_calendar_public_privileges.sql: public SELECT
  // behind RLS; preserve existing service_role ACLs without adding new grants.
  'public.grow_calendar_crops': { rls: true, anon: ['SELECT'], authenticated: ['SELECT'] }
};
const functions = {
  'private.admin_panel_snapshot(text,integer)': ['anon', 'authenticated', 'service_role'],
  'public.admin_panel_snapshot(text,integer)': ['anon', 'authenticated', 'service_role'],
  'public.evaluate_product_readiness(text)': ['service_role'],
  'public.trg_queue_dirty_metafield()': [],
  'public.project_storefront_product_content_metafields(text)': ['service_role'],
  'public.project_collection_content_metafields(text)': ['service_role'],
  'public.trg_project_storefront_product_content()': [],
  'public.trg_project_collection_content()': [],
  'public.build_ingredient_info(jsonb)': ['service_role'],
  'public.consume_storefront_assistant_rate_limit(text,integer,integer)': ['service_role']
};

// These are NOT a recovered production baseline. They allow permission DDL and
// function signatures to load; only the actual rate-limit body is executed below.
const fixtures = `
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema private;
  create schema auth;
  create table auth.users(id uuid primary key);
  grant usage on schema public to anon, authenticated, service_role;
  create table public.content_articles(id uuid primary key);
  create table public.collection_content(shopify_gid text primary key);
  create table public.product_readiness(product_gid text primary key);
  create table public.configurator_projects(id uuid primary key);
  create table private.admin_bootstrap_config(id uuid primary key);
  set check_function_bodies = off;
`;

async function replay({ legacy = false, omitCorrection = false } = {}) {
  const db = new PGlite();
  await db.exec(fixtures);
  // PostgreSQL global PUBLIC EXECUTE must be removed globally, not per schema.
  if (!legacy) await db.exec('alter default privileges revoke execute on functions from public;');
  if (legacy) await db.exec(`
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  `);
  try {
    for (const migration of migrations) {
      if (migration === correction) {
        if (!omitCorrection) await db.exec(migration.sql);
        continue;
      }
      for (const sql of statements(migration.sql)) {
        // Deliberately scoped DDL replay, not a complete reset. Never run business
        // updates, projection calls, cron or data seeds against test fixtures.
        if (/^create\s+(or\s+replace\s+)?(schema|table|view|function)\b/i.test(sql) ||
            /^alter table\s+\S+\s+enable row level security/i.test(sql) ||
            /^(grant|revoke|alter default privileges)\b/i.test(sql)) {
          await db.exec(sql);
        }
      }
    }
    return db;
  } catch (error) { await db.close(); throw error; }
}

async function scalar(db, sql, params = []) {
  return Object.values((await db.query(sql, params)).rows[0])[0];
}

test('SQL splitting keeps function bodies, quoted names and semicolons in strings intact', () => {
  assert.equal(statements(`-- comment;\ncreate function public.x() returns text as $$ select ';'; $$ language sql; select 'a;''b'; /* ignored; */`).length, 2);
});

test('every created table/view/function requires an explicit reviewed permission contract', () => {
  const expected = new Set([...Object.keys(tables), ...Object.keys(additionalTables), 'public.knowledge_dynamic_answers',
    ...Object.keys(functions).map(f => f.split('(')[0])]);
  const actual = new Set();
  for (const m of migrations) for (const sql of statements(m.sql)) {
    const found = sql.match(/^create\s+(?:or\s+replace\s+)?(?:table|view|function)\s+(?:if\s+not\s+exists\s+)?([\w.]+)/i);
    if (found) actual.add(found[1].toLowerCase());
  }
  assert.deepEqual([...actual].sort(), [...expected].sort());
});

test('strict defaults: later resources retain their explicit role and schema contracts', async () => {
  const db = await replay();
  try {
    for (const [table, contract] of Object.entries(additionalTables)) {
      assert.equal(await scalar(db, 'select relrowsecurity from pg_class where oid=$1::regclass', [table]), contract.rls, `${table} RLS`);
      for (const role of ['anon', 'authenticated', 'service_role']) for (const privilege of tablePrivileges)
        assert.equal(await scalar(db, 'select has_table_privilege($1,$2,$3)', [role, table, privilege]),
          (contract[role] || []).includes(privilege), `${role} ${table} ${privilege}`);
    }
    for (const role of ['anon', 'authenticated', 'service_role']) {
      assert.equal(await scalar(db, 'select has_schema_privilege($1,$2,$3)', [role, 'billing_private', 'USAGE']), role === 'service_role', `${role} billing schema USAGE`);
      assert.equal(await scalar(db, 'select has_schema_privilege($1,$2,$3)', [role, 'billing_private', 'CREATE']), false, `${role} billing schema CREATE`);
    }
  } finally { await db.close(); }
});

test('without correction strict defaults reproduce the missing table and RPC grants', async () => {
  const db = await replay({ omitCorrection: true });
  try {
    for (const table of ['public.content_atoms', 'public.content_atom_links'])
      assert.equal(await scalar(db, 'select has_table_privilege($1,$2,$3)', ['service_role', table, 'SELECT']), false);
    assert.equal(await scalar(db, 'select has_function_privilege($1,$2,$3)', ['service_role', 'public.evaluate_product_readiness(text)', 'EXECUTE']), false);
  } finally { await db.close(); }
});

test('strict defaults: all versioned resources have required grants and retain RLS', async () => {
  const db = await replay();
  try {
    for (const [table, privileges] of Object.entries(tables)) {
      assert.equal(await scalar(db, 'select relrowsecurity from pg_class where oid=$1::regclass', [table]), true, table);
      for (const p of privileges)
        assert.equal(await scalar(db, 'select has_table_privilege($1,$2,$3)', ['service_role', table, p]), true, `${table} ${p}`);
      for (const role of ['anon', 'authenticated']) for (const p of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'])
        assert.equal(await scalar(db, 'select has_table_privilege($1,$2,$3)', [role, table, p]), false, `${role} ${table} ${p}`);
    }
    assert.equal(await scalar(db, "select has_table_privilege('service_role','public.knowledge_dynamic_answers','SELECT')"), true);
    for (const role of ['anon','authenticated'])
      assert.equal(await scalar(db, 'select has_table_privilege($1,$2,$3)', [role,'public.knowledge_dynamic_answers','SELECT']), false);
    assert.ok((await scalar(db, "select reloptions from pg_class where oid='public.knowledge_dynamic_answers'::regclass")).includes('security_invoker=true'));
    for (const [fn, callers] of Object.entries(functions)) {
      for (const role of ['anon', 'authenticated', ...callers])
        assert.equal(await scalar(db, 'select has_function_privilege($1,$2,$3)', [role, fn, 'EXECUTE']), callers.includes(role), `${fn} ${role}`);
      assert.equal(await scalar(db, 'select prosecdef from pg_proc where oid=$1::regprocedure', [fn]), fn.startsWith('private.admin_panel_snapshot'), `${fn} security mode`);
    }
    // Actual backend SQL runs as the caller, never as the database owner.
    await db.exec('set role service_role');
    await db.query('select slug from public.content_atoms');
    await db.query('select atom_slug from public.content_atom_links');
    assert.equal(await scalar(db, "select public.consume_storefront_assistant_rate_limit('test-fingerprint',1,3600)"), true);
    assert.equal(await scalar(db, "select public.consume_storefront_assistant_rate_limit('test-fingerprint',1,3600)"), false);
    // GENERATED ALWAYS identity inserts need no extra sequence grant.
    await db.exec("insert into ops.control_audit_log(event_type,actor) values ('test','test')");
    await assert.rejects(db.exec("insert into public.content_atoms(slug,name,content_type,icon_key,one_liner) values ('x','x','x','x','x')"), /permission denied/);
    await db.exec('reset role');
    for (const role of ['anon','authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query('select * from public.content_atoms'), /permission denied/);
      await assert.rejects(db.query("select public.consume_storefront_assistant_rate_limit('test-fingerprint',1,60)"), /permission denied/);
      await assert.rejects(db.query("select public.evaluate_product_readiness('test')"), /permission denied/);
      await db.exec('reset role');
    }
  } finally { await db.close(); }
});

test('internal trigger still executes for a backend writer without direct function EXECUTE', async () => {
  const db = await replay();
  try {
    await db.exec(`
      create table public.shopify_metafield_registry (
        owner_type text, namespace text, key text, active boolean,
        source_of_truth text, sync_direction text
      );
      create table public.shopify_metafield_state (
        id uuid, product_gid text, namespace text, key text,
        dirty_for_shopify boolean, validation_status text, updated_at timestamptz
      );
      alter table public.shopify_metafield_registry enable row level security;
      alter table public.shopify_metafield_state enable row level security;
      grant select on public.shopify_metafield_registry to service_role;
      grant insert on public.shopify_metafield_state to service_role;
      create trigger permission_test after insert on public.shopify_metafield_state
        for each row execute function public.trg_queue_dirty_metafield();
      set role service_role;
      insert into public.shopify_metafield_state(id,dirty_for_shopify) values(gen_random_uuid(),false);
      reset role;
    `);
    assert.equal(await scalar(db, 'select count(*)::int from public.shopify_metafield_state'), 1);
  } finally { await db.close(); }
});

test('correction is idempotent, preserves legacy backend writes and changes no rows/policies', async () => {
  const db = await replay({ legacy: true });
  try {
    await db.exec("set role service_role; insert into public.content_atoms(slug,name,content_type,icon_key,one_liner) values ('kept','Kept','test','test','kept'); reset role;");
    const before = await db.query('select * from public.content_atoms');
    const policies = await db.query('select * from pg_policies order by schemaname,tablename,policyname');
    await db.exec(correction.sql);
    await db.exec(correction.sql);
    assert.deepEqual((await db.query('select * from public.content_atoms')).rows, before.rows);
    assert.deepEqual((await db.query('select * from pg_policies order by schemaname,tablename,policyname')).rows, policies.rows);
    for (const p of ['SELECT','INSERT','UPDATE','DELETE'])
      assert.equal(await scalar(db, 'select has_table_privilege($1,$2,$3)', ['service_role','public.content_atoms',p]), true);
    for (const role of ['anon','authenticated']) for (const fn of ['public.evaluate_product_readiness(text)','public.trg_queue_dirty_metafield()'])
      assert.equal(await scalar(db, 'select has_function_privilege($1,$2,$3)', [role,fn,'EXECUTE']), false, `${role} ${fn}`);
    for (const sql of statements(correction.sql))
      assert.match(sql, /^(begin|commit|grant|revoke)\b/i, 'permission-only correction');
  } finally { await db.close(); }
});

// Full, isolated replay of the calendar migrations exercises their real policy
// and CHECK constraints; the global permission-only replay deliberately skips
// policy DDL, business updates and general ALTER TABLE statements.
async function replayCalendar(legacy) {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      grant usage on schema public to anon, authenticated, service_role;
    `);
    if (legacy) await db.exec('alter default privileges in schema public grant all on tables to anon, authenticated, service_role;');
    for (const name of [
      '20261126010126_add_leaf_grow_calendar_crops.sql',
      '20261126012102_restrict_grow_calendar_public_privileges.sql'
    ]) {
      const migration = migrations.find(m => m.path === name);
      assert.ok(migration, `Missing calendar migration: ${name}`);
      await db.exec(migration.sql);
    }
    return db;
  } catch (error) { await db.close(); throw error; }
}

function calendarRow(slug, changes = {}) {
  return {
    slug, names: { de: 'Testpflanze', en: 'Test plant' }, category: 'vegetables',
    timing: { start_indoor: [3], sow_outdoors: [], transplant_outdoors: [5], harvest_or_flowering: [8], harvest_kind: 'harvest' },
    cultivation_note_de: 'Frostfrei auspflanzen.', cultivation_note_en: 'Plant out after frost.',
    source_refs: [{ title: 'Test source', publisher: 'Test publisher', url: 'https://example.com/source' }],
    review_status: 'draft', is_published: false, approved_at: null,
    ...changes
  };
}

async function insertCalendarRow(db, row) {
  return db.query(`insert into public.grow_calendar_crops
    (slug, names, category, timing, cultivation_note_de, cultivation_note_en, source_refs, review_status, is_published, approved_at)
    values ($1, $2::jsonb, $3, $4::jsonb, $5, $6, $7::jsonb, $8, $9, $10)`,
  [row.slug, JSON.stringify(row.names), row.category, JSON.stringify(row.timing), row.cultivation_note_de,
    row.cultivation_note_en, JSON.stringify(row.source_refs), row.review_status, row.is_published, row.approved_at]);
}

for (const legacy of [false, true]) test(`calendar ${legacy ? 'legacy' : 'strict'} defaults: published-only reads, denied browser writes and publication guards`, async () => {
  const db = await replayCalendar(legacy);
  try {
    const approved = { review_status: 'verified', is_published: true, approved_at: '2026-11-26T00:00:00Z' };
    await insertCalendarRow(db, calendarRow('draft'));
    await insertCalendarRow(db, calendarRow('verified-hidden', { review_status: 'verified' }));
    await insertCalendarRow(db, calendarRow('rejected', { review_status: 'rejected' }));
    await insertCalendarRow(db, calendarRow('published', approved));
    assert.equal(await scalar(db, "select relrowsecurity from pg_class where oid='public.grow_calendar_crops'::regclass"), true);
    // The hardening migration changes only browser grants. Strict defaults add
    // no service grant; an existing legacy backend grant must remain intact.
    for (const privilege of tablePrivileges)
      assert.equal(await scalar(db, 'select has_table_privilege($1,$2,$3)', ['service_role', 'public.grow_calendar_crops', privilege]), legacy, `service_role ${privilege}`);
    if (legacy) {
      await db.exec('set role service_role');
      await insertCalendarRow(db, calendarRow('backend-draft'));
      await db.exec('reset role');
    }
    for (const role of ['anon', 'authenticated']) {
      for (const privilege of tablePrivileges)
        assert.equal(await scalar(db, 'select has_table_privilege($1,$2,$3)', [role, 'public.grow_calendar_crops', privilege]), privilege === 'SELECT', `${role} ${privilege}`);
      await db.exec(`set role ${role}`);
      assert.deepEqual((await db.query('select slug from public.grow_calendar_crops order by slug')).rows, [{ slug: 'published' }]);
      assert.deepEqual((await db.query("select slug from public.grow_calendar_crops where slug='draft'")).rows, []);
      await assert.rejects(insertCalendarRow(db, calendarRow(`blocked-${role}`, approved)), /permission denied/);
      await assert.rejects(db.exec("update public.grow_calendar_crops set is_published=false where slug='published'"), /permission denied/);
      await assert.rejects(db.exec("delete from public.grow_calendar_crops where slug='published'"), /permission denied/);
      await assert.rejects(db.exec('truncate public.grow_calendar_crops'), /permission denied/);
      await db.exec('reset role');
    }
    const checks = [
      { ...approved, review_status: 'draft' },
      { ...approved, approved_at: null },
      { ...approved, source_refs: [] },
      { ...approved, cultivation_note_de: ' ' },
      { ...approved, cultivation_note_en: null },
      { ...approved, timing: { harvest_kind: 'harvest' } },
      { ...approved, timing: { ...calendarRow('unused').timing, harvest_kind: 'unsupported' } }
    ];
    for (const [index, changes] of checks.entries())
      await assert.rejects(insertCalendarRow(db, calendarRow(`invalid-${index}`, changes)), /check constraint/);
    await assert.rejects(db.exec("update public.grow_calendar_crops set is_published=true where slug='draft'"), /check constraint/);
    assert.equal(await scalar(db, "select count(*)::int from public.grow_calendar_crops where is_published"), 1);
  } finally { await db.close(); }
});
