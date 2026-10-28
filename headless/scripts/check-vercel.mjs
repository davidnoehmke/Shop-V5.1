import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// Deliberately use dummy values: this smoke test must not need store credentials.
Object.assign(process.env, {
  SESSION_SECRET: 'vercel-build-smoke-test-only',
  PUBLIC_STORE_DOMAIN: 'example.myshopify.com',
  PUBLIC_STOREFRONT_API_TOKEN: 'smoke-test',
  PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: 'smoke-test',
  PUBLIC_CUSTOMER_ACCOUNT_API_URL: 'https://example.com',
});
const {buildManifest} = JSON.parse(
  readFileSync('.vercel/react-router-build-result.json', 'utf8'),
);
const bundles = Object.values(buildManifest.serverBundles);
assert.ok(bundles.length > 0, 'Vercel must emit an SSR bundle');
for (const bundle of bundles) {
  assert.equal(bundle.config.runtime, 'nodejs');
  const {default: handler} = await import(pathToFileURL(resolve(bundle.file)).href);
  assert.equal(typeof handler, 'function', 'Vercel needs a Fetch handler, not an Oxygen worker object');
  const response = await handler(new Request('https://preview.example/robots.txt'));
  assert.equal(response.status, 200);
  assert.match(await response.text(), /User-agent:/);
  assert.match(response.headers.get('X-Robots-Tag'), /noindex/);
}
process.stdout.write('Vercel Node bundles accept a real Request and return a noindex robots response.\n');
