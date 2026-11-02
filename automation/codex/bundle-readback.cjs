#!/usr/bin/env node
'use strict';

// Offline, read-only reconciliation. Never projects data or authorizes a sale.
const fs = require('node:fs');
const assert = require('node:assert/strict');

function connection(value, label) {
  assert.ok(Array.isArray(value?.nodes), `${label}: connection not read`);
  assert.equal(value.pageInfo?.hasNextPage, false, `${label}: incomplete pagination`);
  return value.nodes;
}

function quantities(rows) {
  const result = new Map();
  for (const {id, quantity} of rows) {
    assert.match(id || '', /^gid:\/\/shopify\/ProductVariant\/\d+$/, 'Missing variant identity');
    assert.ok(Number.isSafeInteger(quantity) && quantity > 0, 'Invalid component quantity');
    const total = (result.get(id) || 0) + quantity;
    assert.ok(Number.isSafeInteger(total), 'Component quantity overflow');
    result.set(id, total);
  }
  return result;
}

function difference(expected, actual) {
  return [...new Set([...expected.keys(), ...actual.keys()])].sort().flatMap(id => {
    const expectedQuantity = expected.get(id) || 0;
    const actualQuantity = actual.get(id) || 0;
    return expectedQuantity === actualQuantity ? [] : [{id, expectedQuantity, actualQuantity}];
  });
}

function auditBundle(ssot, product) {
  assert.equal(product?.id, ssot.shopify_product_gid, 'Parent product identity mismatch');
  assert.equal(product.handle, ssot.slug, 'Parent handle mismatch');
  // Choices/upgrades require a selected recipe per parent variant, not a union.
  assert.ok(Array.isArray(ssot.components) && ssot.components.length > 0, 'Missing SSOT components');
  assert.ok(ssot.components.every(c => c.role === 'required' && !c.selection_group),
    'Selection-dependent bundle needs an explicit selected recipe');
  const expected = quantities(ssot.components.map(c => ({id: c.shopify_variant_gid, quantity: c.quantity})));
  const productComponents = connection(product.bundleComponents, 'product components');
  const variants = connection(product.variants, 'parent variants');
  assert.ok(variants.length > 0, 'No parent variants read');
  const variantReadback = variants.map(variant => {
    const rows = connection(variant.productVariantComponents, 'variant components');
    // Product-level relationships describe available options; variant-level rows
    // identify the actual component variant AND its quantity for this parent.
    const actual = quantities(rows.map(c => ({id: c.productVariant?.id, quantity: c.quantity})));
    const mismatches = difference(expected, actual);
    const productMismatches = rows.flatMap(c => {
      const expectedRow = ssot.components.find(e => e.shopify_variant_gid === c.productVariant.id);
      return expectedRow && expectedRow.shopify_product_gid !== c.productVariant.product?.id
        ? [{id: c.productVariant.id, expectedProduct: expectedRow.shopify_product_gid,
            actualProduct: c.productVariant.product?.id}] : [];
    });
    return {parentVariantId: variant.id, componentCount: rows.length,
      mechanism: rows.length ? (productComponents.length ? 'product_and_variant_fixed' : 'variant_fixed')
        : 'unresolved_or_external',
      mappingMatches: variant.requiresComponents === true && mismatches.length === 0 && productMismatches.length === 0,
      mismatches, productMismatches};
  });
  return {slug: ssot.slug, productComponentCount: productComponents.length, variants: variantReadback,
    mappingMatches: variantReadback.every(v => v.mappingMatches),
    // No mapping, sync status, intent, inventory or API availability substitutes
    // for deployed checkout protection and real end-to-end QA.
    activationAuthorized: false};
}

// Audits a native bundle group using its ORDER-TIME recipe. It never expands an
// order parent using today's mutable catalog, never invents shipping lines and
// never counts separately bought units of a component as part of the bundle.
function auditOrderGroup({order, groupId, parentVariantId, recipe}) {
  const lines = connection(order.lineItems, 'order lines');
  const grouped = lines.filter(line => line.lineItemGroup?.id === groupId);
  assert.ok(grouped.length > 0, 'No trusted Shopify bundle group found');
  const group = grouped[0].lineItemGroup;
  assert.equal(group.variantId, parentVariantId, 'Wrong bundle parent');
  assert.ok(Number.isSafeInteger(group.quantity) && group.quantity > 0, 'Invalid bundle quantity');
  assert.ok(grouped.every(line => line.lineItemGroup.variantId === parentVariantId &&
    line.lineItemGroup.quantity === group.quantity), 'Inconsistent Shopify bundle group');
  const expected = quantities(recipe.map(c => ({id: c.id, quantity: c.quantity * group.quantity})));
  const actual = quantities(grouped.map(line => ({id: line.variant?.id, quantity: line.quantity})));
  const mismatches = difference(expected, actual);
  // Existing FulfillmentOrder line IDs and remaining quantities are authoritative
  // for a fulfillment operation (not ProductVariant IDs or catalog quantities).
  const fulfillmentLines = connection(order.fulfillmentOrders, 'fulfillment orders')
    .flatMap(fo => connection(fo.lineItems, 'fulfillment lines').map(line => ({...line, fulfillmentOrderId: fo.id})));
  const targets = fulfillmentLines.filter(line => grouped.some(g => g.id === line.lineItem?.id));
  assert.equal(new Set(targets.map(t => t.id)).size, targets.length, 'Duplicate fulfillment line');
  for (const target of targets) {
    assert.ok(target.id && target.fulfillmentOrderId, 'Missing fulfillment identity');
    assert.ok(Number.isSafeInteger(target.remainingQuantity) && target.remainingQuantity >= 0,
      'Invalid remaining fulfillment quantity');
  }
  const fulfillmentCoverage = grouped.every(line => {
    assert.ok(Number.isSafeInteger(line.unfulfilledQuantity) && line.unfulfilledQuantity >= 0,
      'Missing unfulfilled order quantity');
    return targets.filter(t => t.lineItem.id === line.id)
      .reduce((sum, t) => sum + t.remainingQuantity, 0) === line.unfulfilledQuantity;
  });
  return {mappingMatches: mismatches.length === 0, mismatches, fulfillmentCoverage,
    fulfillmentTargets: targets.filter(t => t.remainingQuantity > 0).map(t => ({
      fulfillmentOrderId: t.fulfillmentOrderId, fulfillmentOrderLineItemId: t.id,
      remainingQuantity: t.remainingQuantity})), activationAuthorized: false};
}

module.exports = {auditBundle, auditOrderGroup};
if (require.main === module) {
  try {
    const snapshot = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
    assert.ok(Array.isArray(snapshot.entries) && snapshot.entries.length > 0, 'No bundle entries');
    const results = snapshot.entries.map(({ssot, shopify}) => auditBundle(ssot, shopify));
    console.log(JSON.stringify({observed_at: snapshot.observed_at, results}, null, 2));
    if (results.some(r => !r.mappingMatches)) process.exitCode = 1;
  } catch (error) { console.error(`Bundle audit incomplete: ${error.message}`); process.exitCode = 2; }
}
