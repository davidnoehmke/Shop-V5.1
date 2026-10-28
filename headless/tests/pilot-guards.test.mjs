import test from 'node:test';
import assert from 'node:assert/strict';
import {variantGid, safeCartRedirect} from '../app/lib/pilot-guards.ts';

test('existing numeric variant links retain their exact Shopify identity', () => {
  assert.equal(variantGid('12345678901234'), 'gid://shopify/ProductVariant/12345678901234');
  assert.equal(variantGid(null), null);
  for (const value of ['', '0', '-1', '12x', 'gid://shopify/ProductVariant/1']) {
    assert.throws(() => variantGid(value), (error) => error.status === 400);
  }
});

test('cart return paths cannot redirect buyers to another origin', () => {
  assert.equal(safeCartRedirect('/cart?source=product'), '/cart?source=product');
  for (const value of [null, 'https://example.org', '//example.org', '/\\example.org', '/\nexample.org']) {
    assert.equal(safeCartRedirect(value), null);
  }
});
