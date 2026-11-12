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
let forwardedPosts = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  assert.equal(new URL(input).hostname, 'example.myshopify.com');
  assert.equal(init.method, 'POST');
  assert.equal(init.duplex, 'half', 'Node streamed proxy uploads require duplex');
  assert.ok(init.body instanceof ReadableStream);
  assert.match(await new Response(init.body).text(), /ensureCookies/);
  forwardedPosts++;
  return Response.json({data: {consentManagement: {cookies: {cookieDomain: 'preview.example'}}}});
};
for (const bundle of bundles) {
  assert.equal(bundle.config.runtime, 'nodejs');
  const {default: handler} = await import(pathToFileURL(resolve(bundle.file)).href);
  assert.equal(typeof handler, 'function', 'Vercel needs a Fetch handler, not an Oxygen worker object');
  const response = await handler(new Request('https://preview.example/robots.txt'));
  assert.equal(response.status, 200);
  assert.match(await response.text(), /User-agent:/);
  assert.match(response.headers.get('X-Robots-Tag'), /noindex/);
  const consent = await handler(new Request('https://preview.example/api/unstable/graphql.json', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({query: 'query ensureCookies { consentManagement { cookies(visitorConsent:{}) { cookieDomain } } }'}),
  }));
  assert.equal(consent.status, 200);
  assert.equal((await consent.json()).data.consentManagement.cookies.cookieDomain, 'preview.example');
}
globalThis.fetch = originalFetch;
assert.equal(forwardedPosts, bundles.length);
process.stdout.write('Vercel Node bundles serve noindex robots and forward streamed consent POST requests.\n');
