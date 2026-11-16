'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const {previewReference, previewUrl, fetchStorefrontPage} = require('./theme-preview.cjs');
const sha = 'a'.repeat(40);
test('production remains the default without a verified PR preview', () => {
  assert.equal(previewReference({}), null);
  assert.equal(previewReference({pull_request:{body:'Preview soon',head:{sha}}}), null);
  assert.equal(previewUrl('https://leaferservice.com/en/products/bims',null).href,'https://leaferservice.com/en/products/bims');
});
test('preview audits the requested route and language on the current PR head', () => {
  const preview = previewReference({pull_request:{body:`<!-- leaf-preview theme_id=190712709505 source_sha=${sha} -->`,head:{sha}}});
  const url = previewUrl('https://leaferservice.com/en/products/bims',preview);
  assert.equal(url.pathname,'/en/products/bims');
  assert.equal(url.searchParams.get('preview_theme_id'),'190712709505');
  assert.equal(preview.sha,sha);
});
test('stale previews and external preview URLs cannot pass validation', () => {
  assert.throws(()=>previewReference({pull_request:{body:`<!-- leaf-preview theme_id=190712709505 source_sha=${sha} -->`,head:{sha:'b'.repeat(40)}}}),/another PR head/);
  assert.throws(()=>previewUrl('https://external.example/',{themeId:'190712709505'}),/public storefront/);
});
test('malformed or duplicated preview declarations cannot fall back to production', () => {
  const marker = `<!-- leaf-preview theme_id=190712709505 source_sha=${sha} -->`;
  for (const body of ['<!-- leaf-preview theme_id=bad -->', `${marker}\n${marker}`, `${marker}\n<!-- leaf-preview invalid -->`]) {
    assert.throws(() => previewReference({pull_request: {body, head: {sha}}}), /valid and unique/);
  }
});
test('Shopify preview cookies survive the redirect that strips the preview parameter', async () => {
  const requests = [];
  const fakeFetch = async (url, options) => {
    requests.push({url, cookie:options.headers.get('cookie')});
    if (requests.length === 1) return new Response(null,{status:302,headers:{location:'/?_fd=0&pb=0','set-cookie':'preview_theme=190712709505; Secure; Path=/'}});
    return new Response('candidate rendered',{status:200});
  };
  const result = await fetchStorefrontPage('https://leaferservice.com/?preview_theme_id=190712709505',{},fakeFetch);
  assert.equal(result.html,'candidate rendered');
  assert.equal(requests[1].cookie,'preview_theme=190712709505');
});
test('public preview cookies are never forwarded to another origin', async () => {
  await assert.rejects(fetchStorefrontPage('https://leaferservice.com/',{},async()=>new Response(null,{status:302,headers:{location:'https://external.example/','set-cookie':'preview_theme=123; Secure'}})),/expected origin/);
});
