import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {withNodeStreamUploads} from '../app/lib/node-fetch.ts';

test('Node adapter forwards a real streamed POST body', async () => {
  const server = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    response.end(body);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const request = new Request('https://preview.example/api/unstable/graphql.json', {method: 'POST', body: 'consent-probe'});
    const response = await withNodeStreamUploads(fetch)(`http://127.0.0.1:${server.address().port}`, {method: request.method, body: request.body});
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'consent-probe');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('non-stream uploads preserve their original options', async () => {
  const init = {method: 'POST', body: 'ordinary-body'};
  let actual;
  await withNodeStreamUploads(async (_input, options) => {actual = options; return new Response();})('https://example.com', init);
  assert.equal(actual, init);
});
