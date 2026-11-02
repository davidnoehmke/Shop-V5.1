'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {auditBundle, auditOrderGroup} = require('./bundle-readback.cjs');
const fixture = require('./fixtures/bundle-readback-20261011.json');
const clone = value => structuredClone(value);
const entry = slug => clone(fixture.entries.find(e => e.ssot.slug === slug));
const conn = nodes => ({nodes, pageInfo: {hasNextPage: false}});
const vid = n => `gid://shopify/ProductVariant/${n}`;

test('all four matching native bundles resolve by exact variant ID and quantity', () => {
  for (const slug of ['anzucht-starter-set', 'anzucht-pro-set', 'aroid-umtopf-set', 'efeutute-hange-set']) {
    const {ssot, shopify} = entry(slug);
    assert.equal(auditBundle(ssot, shopify).mappingMatches, true, slug);
    assert.equal(auditBundle(ssot, shopify).activationAuthorized, false);
  }
});
test('empty product-level connection does not erase a valid variant fixed bundle', () => {
  const {ssot, shopify} = entry('aroid-umtopf-set');
  const report = auditBundle(ssot, shopify);
  assert.equal(report.productComponentCount, 0);
  assert.equal(report.variants[0].mechanism, 'variant_fixed');
  assert.equal(report.variants[0].componentCount, 4);
});
test('trio flags the missing Crassula even though both sale flags are true', () => {
  const {ssot, shopify} = entry('sukkulenten-trio-set');
  const report = auditBundle(ssot, shopify);
  assert.equal(report.mappingMatches, false);
  assert.deepEqual(report.variants[0].mismatches, [{id: vid(56261995299201), expectedQuantity: 1, actualQuantity: 0}]);
});
test('a replacement variant is not accepted on product identity or title alone', () => {
  const {ssot, shopify} = entry('sukkulenten-trio-set');
  shopify.variants.nodes[0].productVariantComponents.nodes.push({quantity: 1,
    productVariant: {id: vid(56387608969601), product: {id: 'gid://shopify/Product/15533650149761'}}});
  const report = auditBundle(ssot, shopify);
  assert.equal(report.mappingMatches, false);
  assert.equal(report.variants[0].mismatches.length, 2);
});
test('same count with wrong component or quantity is rejected', () => {
  for (const change of [row => row.quantity = 2, row => row.productVariant.id = vid(999)]) {
    const {ssot, shopify} = entry('anzucht-starter-set');
    change(shopify.variants.nodes[0].productVariantComponents.nodes[0]);
    assert.equal(auditBundle(ssot, shopify).mappingMatches, false);
  }
});
test('wrong component product identity is rejected', () => {
  const {ssot, shopify} = entry('anzucht-starter-set');
  shopify.variants.nodes[0].productVariantComponents.nodes[0].productVariant.product.id = 'gid://shopify/Product/999';
  assert.equal(auditBundle(ssot, shopify).mappingMatches, false);
});
test('pagination or a missing readback never gives a clean result', () => {
  for (const edit of [p => p.bundleComponents.pageInfo.hasNextPage = true,
    p => p.variants.pageInfo.hasNextPage = true,
    p => p.variants.nodes[0].productVariantComponents.pageInfo.hasNextPage = true,
    p => delete p.variants.nodes[0].productVariantComponents]) {
    const {ssot, shopify} = entry('aroid-umtopf-set'); edit(shopify);
    assert.throws(() => auditBundle(ssot, shopify), /incomplete pagination|not read/);
  }
});
test('missing parent, wrong parent, invalid quantities and unselected choices are rejected', () => {
  const {ssot, shopify} = entry('aroid-umtopf-set');
  assert.throws(() => auditBundle(ssot, null), /identity/);
  assert.throws(() => auditBundle(ssot, {...shopify, id: 'wrong'}), /identity/);
  for (const quantity of [0, -1, 1.5, null, '1']) {
    const s = clone(ssot); s.components[0].quantity = quantity;
    assert.throws(() => auditBundle(s, shopify), /quantity/);
  }
  const s = clone(ssot); s.components[0].role = 'choice';
  assert.throws(() => auditBundle(s, shopify), /selected recipe/);
});
test('audit never mutates source prices, inventory, rollout flags or mappings', () => {
  const before = JSON.stringify(fixture);
  for (const {ssot, shopify} of fixture.entries) auditBundle(ssot, shopify);
  assert.equal(JSON.stringify(fixture), before);
});

function orderCase() {
  const group = {id: 'group-1', variantId: vid(10), quantity: 2};
  const line = {id: 'line-1', variant: {id: vid(11)}, quantity: 10,
    unfulfilledQuantity: 5, lineItemGroup: group};
  return {groupId: group.id, parentVariantId: vid(10), recipe: [{id: vid(11), quantity: 5}],
    order: {lineItems: conn([line, {id: 'separate', variant: {id: vid(11)}, quantity: 1, lineItemGroup: null}]),
      fulfillmentOrders: conn([
        {id: 'fo-1', lineItems: conn([{id: 'fol-1', lineItem: {id: line.id}, remainingQuantity: 3}])},
        {id: 'fo-2', lineItems: conn([{id: 'fol-2', lineItem: {id: line.id}, remainingQuantity: 2}])}
      ])}};
}
test('order uses native group and component quantities once; standalone units are separate', () => {
  const input = orderCase();
  const before = JSON.stringify(input);
  const report = auditOrderGroup(input);
  assert.equal(report.mappingMatches, true);
  assert.equal(report.fulfillmentCoverage, true);
  assert.deepEqual(report.fulfillmentTargets, [
    {fulfillmentOrderId: 'fo-1', fulfillmentOrderLineItemId: 'fol-1', remainingQuantity: 3},
    {fulfillmentOrderId: 'fo-2', fulfillmentOrderLineItemId: 'fol-2', remainingQuantity: 2}
  ]);
  assert.equal(report.activationAuthorized, false);
  assert.equal(JSON.stringify(input), before);
});
test('a parent-only order cannot be expanded from current catalog data', () => {
  const input = orderCase(); input.order.lineItems.nodes[0].lineItemGroup = null;
  assert.throws(() => auditOrderGroup(input), /No trusted Shopify bundle group/);
});
test('missing component in order and missing fulfillment allocation are detected independently', () => {
  const input = orderCase(); input.recipe.push({id: vid(12), quantity: 1});
  assert.equal(auditOrderGroup(input).mappingMatches, false);
  input.order.fulfillmentOrders.nodes.pop();
  assert.equal(auditOrderGroup(input).fulfillmentCoverage, false);
});
test('incomplete fulfillment read, deleted order variant or wrong group is not a pass', () => {
  const input = orderCase(); input.order.fulfillmentOrders.pageInfo.hasNextPage = true;
  assert.throws(() => auditOrderGroup(input), /pagination/);
  const deleted = orderCase(); deleted.order.lineItems.nodes[0].variant = null;
  assert.throws(() => auditOrderGroup(deleted), /identity/);
  const wrong = orderCase(); wrong.parentVariantId = vid(999);
  assert.throws(() => auditOrderGroup(wrong), /Wrong bundle parent/);
});
