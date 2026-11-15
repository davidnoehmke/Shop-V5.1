import assert from 'node:assert/strict';
import {test} from 'node:test';
import {serializeCookieHeader} from '@supabase/ssr';
import {assertSameOriginPost, createAuth, portalDestination, requirePortalUser} from '../app/lib/supabase-auth.server.ts';
const env = {SUPABASE_URL: 'https://test.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test'};
const user = {id: '11111111-1111-4111-8111-111111111111', email: 'test@example.invalid', aud: 'authenticated', role: 'authenticated', is_anonymous: false};
const request = (path = '/portal', cookie) => new Request(`https://shop.example${path}`, {headers: cookie ? {Cookie: cookie} : {}});
const jwt = expiry => ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({sub: user.id, exp: expiry})).toString('base64url'), 'signature'].join('.');
function sessionCookie(expiry = Math.floor(Date.now()/1000) + 3600) {
  const session = {access_token: jwt(expiry), refresh_token: 'refresh-test', expires_at: expiry, expires_in: 3600, token_type: 'bearer', user};
  return serializeCookieHeader('sb-test-auth-token', `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`, {}).split(';')[0];
}
test('return destinations cannot leave the protected portal', () => {
  for (const value of ['https://evil.example/portal', '//evil.example/portal', '/account', '/portalish', '/portal/\\evil', '/portal/../../account', '\r\nLocation: evil', null]) assert.equal(portalDestination(value), '/portal');
  assert.equal(portalDestination('/portal?lang=en'), '/portal?lang=en');
  assert.equal(portalDestination('/portal/settings'), '/portal/settings');
});
test('mutations reject GET, missing Origin and cross-origin requests', () => {
  assert.throws(() => assertSameOriginPost(request()), e => e.status === 405);
  for (const origin of [undefined, 'https://evil.example', 'null']) assert.throws(() => assertSameOriginPost(new Request('https://shop.example/auth/login', {method: 'POST', headers: origin ? {Origin: origin} : {}})), e => e.status === 403);
  assert.doesNotThrow(() => assertSameOriginPost(new Request('https://shop.example/auth/login', {method: 'POST', headers: {Origin: 'https://shop.example'}})));
});
test('missing configuration fails closed with non-cacheable 503', () => {
  assert.throws(() => createAuth(request(), {}), e => e.status === 503 && /no-store/.test(e.headers.get('Cache-Control')));
});
test('direct anonymous navigation redirects without exposing portal data', async () => {
  await assert.rejects(requirePortalUser(request('/portal?lang=en'), env), e => e.status === 302 && e.headers.get('Location') === '/auth/login?returnTo=%2Fportal%3Flang%3Den' && /no-store/.test(e.headers.get('Cache-Control')));
});
test('server verifies identity instead of trusting a forged cookie user', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {calls++; return Response.json({msg: 'invalid token'}, {status: 401});});
  await assert.rejects(requirePortalUser(request('/portal', sessionCookie()), env), e => e.status === 302);
  assert.equal(calls, 1);
});
test('verified users can access the portal, anonymous Auth users cannot', async t => {
  let anonymous = false;
  t.mock.method(globalThis, 'fetch', async () => Response.json({...user, is_anonymous: anonymous}));
  const result = await requirePortalUser(request('/portal', sessionCookie()), env);
  assert.equal(result.user.id, user.id);
  assert.match(result.headers.get('Cache-Control'), /no-store/);
  anonymous = true;
  await assert.rejects(requirePortalUser(request('/portal', sessionCookie()), env), e => e.status === 302);
});
test('expired sessions refresh and preserve secure response cookies', async t => {
  let refreshed = false;
  t.mock.method(globalThis, 'fetch', async url => {
    if (String(url).includes('/token')) {refreshed = true; return Response.json({access_token: jwt(Math.floor(Date.now()/1000) + 3600), refresh_token: 'new-refresh', expires_in: 3600, token_type: 'bearer', user});}
    return Response.json(user);
  });
  const result = await requirePortalUser(request('/portal', sessionCookie(Math.floor(Date.now()/1000) - 60)), env);
  assert.equal(refreshed, true);
  assert.ok(result.headers.getSetCookie().length > 0);
  for (const cookie of result.headers.getSetCookie()) for (const flag of [/HttpOnly/i, /Secure/i, /SameSite=Lax/i, /Path=\//i]) assert.match(cookie, flag);
  assert.match(result.headers.get('Cache-Control'), /no-store/);
});
test('logout deletes session cookies and subsequent requests are denied', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(null, {status: 204}));
  const auth = createAuth(request('/auth/logout', sessionCookie()), env);
  const {error} = await auth.client.auth.signOut({scope: 'local'});
  assert.equal(error, null);
  assert.ok(auth.headers.getSetCookie().some(cookie => /Max-Age=0/i.test(cookie)));
  await assert.rejects(requirePortalUser(request(), env), e => e.status === 302);
});
