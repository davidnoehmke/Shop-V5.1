'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const {createStorefrontRequester} = require('./storefront-requester.cjs');

function fixture(fetchImpl) {
  let time = 0;
  const calls = [];
  const get = createStorefrontRequester({
    now: () => time,
    sleep: async ms => { time += ms; },
    fetchImpl: async (url, options) => {
      calls.push({url, time, options});
      return fetchImpl(url, options, calls);
    }
  });
  return {get, calls};
}
test('concurrent pages and their redirects share request pacing and isolated cookies', async () => {
  const {get, calls} = fixture(async url => url.endsWith('/first')
    ? new Response(null, {status:302, headers:{location:'/rendered', 'set-cookie':'preview_theme=123; Secure; Path=/'}})
    : new Response('rendered', {status:200}));
  await Promise.all([get('https://leaferservice.com/first'), get('https://leaferservice.com/second')]);
  assert.deepEqual(calls.map(c => new URL(c.url).pathname), ['/first', '/rendered', '/second']);
  assert.deepEqual(calls.map(c => c.time), [0, 1000, 2000]);
  assert.equal(calls[1].options.headers.get('cookie'), 'preview_theme=123');
  assert.equal(calls[2].options.headers.get('cookie'), null);
  assert.equal(new Set(calls.map(c => c.options.signal)).size, 3);
});
test('Retry-After blocks every queued page until the retry completes', async () => {
  const {get, calls} = fixture(async (_url, _options, requests) => requests.length === 1
    ? new Response('slow down', {status:429, headers:{'retry-after':'3'}})
    : new Response('rendered', {status:200}));
  const responses = await Promise.all([get('https://leaferservice.com/first'), get('https://leaferservice.com/second')]);
  assert.deepEqual(responses.map(r => r.status), [200, 200]);
  assert.deepEqual(calls.map(c => new URL(c.url).pathname), ['/first', '/first', '/second']);
  assert.deepEqual(calls.map(c => c.time), [0, 5000, 6000]);
});
test('a Retry-After beyond the crawl budget stops subsequent network requests', async () => {
  const {get, calls} = fixture(async () => new Response('slow down', {status:429, headers:{'retry-after':'61'}}));
  assert.equal((await get('https://leaferservice.com/first')).status, 429);
  await assert.rejects(get('https://leaferservice.com/second'), /crawl stopped/);
  assert.equal(calls.length, 1);
});
test('exhausted transient retries remain a failure and halt the shared requester', async () => {
  const {get, calls} = fixture(async () => new Response('temporarily unavailable', {status:503}));
  assert.equal((await get('https://leaferservice.com/first')).status, 503);
  await assert.rejects(get('https://leaferservice.com/second'), /crawl stopped/);
  assert.equal(calls.length, 5);
  assert.deepEqual(calls.map(c => c.time), [0, 5000, 15000, 30000, 50000]);
});
