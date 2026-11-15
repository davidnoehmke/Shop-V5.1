import assert from 'node:assert/strict';
import {test} from 'node:test';
import {checkPreviewEnv} from '../scripts/preview-env.mjs';

const guest = {
  SESSION_SECRET: 'test-only-session-value-of-at-least-32-characters',
  PUBLIC_STORE_DOMAIN: 'test-store.myshopify.com',
  PUBLIC_STOREFRONT_API_TOKEN: 'test-only-public-access',
  PUBLIC_CHECKOUT_DOMAIN: 'test-store.myshopify.com',
};

test('missing runtime config blocks deployment without disclosing values', () => {
  const result = checkPreviewEnv({SESSION_SECRET: 'private-short-test-value'});
  assert.equal(result.errors.length, 4);
  assert.ok(result.errors.some((error) => error.startsWith('SESSION_SECRET:')));
  assert.ok(!JSON.stringify(result).includes('private-short-test-value'));
});

test('guest shopping does not require private tokens, account login or attribution', () => {
  const result = checkPreviewEnv(guest);
  assert.deepEqual(result.errors, []);
  assert.equal(result.warnings.length, 2);
});

test('reject placeholder credentials and URL-shaped hostnames', () => {
  const result = checkPreviewEnv({...guest, PUBLIC_STORE_DOMAIN: 'https://test-store.myshopify.com/', PUBLIC_STOREFRONT_API_TOKEN: 'your-public-storefront-token'});
  assert.equal(result.errors.length, 2);
  assert.ok(!JSON.stringify(result).includes('https://'));
});

test('complete account and attribution config clears optional warnings', () => {
  const result = checkPreviewEnv({...guest, SHOP_ID: '123456', PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: 'test-client', PUBLIC_STOREFRONT_ID: '123'});
  assert.deepEqual(result, {errors: [], warnings: []});
});
