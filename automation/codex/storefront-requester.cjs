'use strict';
const {fetchStorefrontPage} = require('./theme-preview.cjs');

// One queue owns all requests, redirect hops and retry waits for this crawl.
function createStorefrontRequester({fetchImpl = fetch, now = Date.now, sleep = ms => new Promise(resolve => setTimeout(resolve, ms))} = {}) {
  let queue = Promise.resolve(), nextRequestAt = 0, halted = false;
  async function pacedFetch(url, options) {
    const delay = Math.max(0, nextRequestAt - now());
    if (delay) await sleep(delay);
    nextRequestAt = now() + 1000;
    // Queue and backoff time must not consume a network request's timeout.
    return fetchImpl(url, {...options, signal: AbortSignal.timeout(25000)});
  }
  async function run(url) {
    if (halted) throw new Error('Storefront crawl stopped after an unresolved transient response');
    let error;
    for (let attempt = 0; attempt < 5; attempt++) {
      let response;
      try {
        response = await fetchStorefrontPage(url, {headers: {
          'user-agent': 'LEAFerservice-link-audit/1.0 (+https://leaferservice.com)',
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }}, pacedFetch);
      } catch (caught) {
        error = caught;
        continue;
      }
      if (response.status !== 429 && response.status < 500) return response;
      const header = response.retryAfter;
      const seconds = header && /^\d+$/.test(header) ? Number(header) : header ? (Date.parse(header) - now()) / 1000 : 5 * (attempt + 1);
      const backoff = Math.max(5000, Number.isFinite(seconds) ? seconds * 1000 : 5000);
      if (attempt === 4 || backoff > 60000) {
        halted = true;
        return response;
      }
      await sleep(backoff);
    }
    halted = true;
    throw error;
  }
  return url => {
    const result = queue.then(() => run(url));
    queue = result.catch(() => undefined);
    return result;
  };
}
module.exports = {createStorefrontRequester};
