#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const theme = fs.readFileSync('sections/main-product.liquid', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20261011020000_bundle_only_pilot_intent.sql', 'utf8');
const docs = fs.readFileSync('docs/BUNDLE_ONLY_PILOT_20261011.md', 'utf8');

const requiredThemeTokens = [
  'bundle_only_enforced.value == true',
  'data-bundle-only=',
  "const bundleOnly = option.dataset.bundleOnly === 'true';",
  'const purchasable = available && !bundleOnly;',
  'data-product-bundle-only-note',
  "button.disabled = !purchasable;",
  'section.querySelectorAll(\'[data-product-submit]\')',
];
for (const token of requiredThemeTokens) {
  assert.ok(theme.includes(token), 'Missing Shopify UI fail-safe token: ' + token);
}

const flaggedSkus = [
  ['kokos-quelltabs', '5'], ['kokos-quelltabs', '10'],
  ['anzuchtbecher-kompostierbar-fur-aussaat-jungpflanzen', '5'],
  ['anzuchtbecher-kompostierbar-fur-aussaat-jungpflanzen', '10'],
  ['anzuchttopf-terrakotta-fur-aussaat-jungpflanzen', '6,5 cm'],
  ['rankhilfe-modular-schwarz', '1'],
];
for (const [handle, title] of flaggedSkus) {
  assert.ok(migration.includes("'"+handle+"','"+title+"'"), 'Missing SSOT intent for ' + handle + ':' + title);
}
for (const bundle of ['anzucht-mini-set', 'leaferservice-blumat-12-pflanzen-pilot']) {
  assert.ok(migration.includes("'"+bundle+"'"), 'Missing blocked draft bundle: ' + bundle);
}
assert.match(migration, /'standalone_checkout_blocked',false/);
assert.match(migration, /'do_not_change_shopify_variant_status',true/);
assert.match(migration, /'draft','blocked'/);
assert.match(migration, /ON CONFLICT \(bundle_id,position\) DO NOTHING/);
assert.match(docs, /server-side/i);
assert.match(docs, /not.*stock/i);

// Fail closed for accidental frontend-only enforcement claims.
assert.ok(!theme.includes('requested_sales_mode'), 'Intent-only SSOT state must not disable purchasing');
assert.ok(!migration.includes('inventory_management = true'), 'Pilot must not enable inventory tracking');
assert.ok(!migration.includes('SET status = \'draft\''), 'Pilot must not downgrade an active Shopify product');

console.log('Bundle-only SSOT planning, blocked drafts and gated storefront UI validated.');
