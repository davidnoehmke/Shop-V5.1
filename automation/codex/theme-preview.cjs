'use strict';
// A preview must be tied to the current PR head; an old theme URL is not evidence.
function previewReference(event) {
  if (!event.pull_request) return null;
  const body = event.pull_request.body || '';
  const declarations = body.match(/<!--\s*leaf-preview\b/g) || [];
  if (!declarations.length) return null;
  const markers = [...body.matchAll(/<!-- leaf-preview theme_id=([1-9][0-9]{5,19}) source_sha=([a-f0-9]{40}) -->/g)];
  if (declarations.length !== 1 || markers.length !== 1) throw new Error('Theme preview marker must be valid and unique.');
  const marker = markers[0];
  if (marker[2] !== event.pull_request.head.sha) throw new Error('Theme preview belongs to another PR head; upload and verify the current candidate first.');
  return {themeId: marker[1], sha: marker[2]};
}
function previewUrl(url, preview) {
  const result = new URL(url);
  if (preview) {
    if (result.origin !== 'https://leaferservice.com') throw new Error('Theme preview must stay on the public storefront.');
    result.searchParams.set('preview_theme_id', preview.themeId);
    result.searchParams.set('_fd', '0');
    result.searchParams.set('pb', '0');
  }
  return result;
}
async function fetchStorefrontPage(url, options = {}, fetchImpl = fetch) {
  let current = new URL(url);
  const origin = current.origin, cookies = new Map();
  for (let redirects = 0; redirects <= 10; redirects++) {
    const headers = new Headers(options.headers);
    if (cookies.size) headers.set('cookie', [...cookies].map(([key, value]) => `${key}=${value}`).join('; '));
    const response = await fetchImpl(current.href, {...options, headers, redirect: 'manual'});
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';', 1)[0], separator = pair.indexOf('=');
      if (separator > 0) cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Storefront redirect has no destination');
      const next = new URL(location, current);
      if (next.origin !== origin) throw new Error('Storefront redirect left the expected origin');
      await response.body?.cancel();
      current = next;
      continue;
    }
    return {status:response.status, url:current.href, html:await response.text(), retryAfter:response.headers.get('retry-after')};
  }
  throw new Error('Storefront redirect limit reached');
}
module.exports = {previewReference, previewUrl, fetchStorefrontPage};
