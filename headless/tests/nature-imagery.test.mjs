import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loader} from '../app/routes/api.nature-imagery.ts';
test('regional imagery rejects malformed coordinates before requesting NASA', async () => {
  for (const bbox of ['1,2,3', '-190,-10,5,10', '0,30,10,20', 'NaN,0,1,2']) {
    await assert.rejects(
      loader({
        request: new Request(
          'https://example.com/api/nature-imagery?layer=base&bbox=' +
            encodeURIComponent(bbox),
        ),
      }),
      (e) => e.status === 400,
    );
  }
});
test('regional base imagery uses a fixed NASA host and bounded image dimensions', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(url.hostname, 'gibs.earthdata.nasa.gov');
    assert.equal(
      url.searchParams.get('LAYERS'),
      'BlueMarble_ShadedRelief_Bathymetry',
    );
    assert.equal(url.searchParams.get('WIDTH'), '1024');
    assert.equal(url.searchParams.get('BBOX'), '-70,15,-63,22');
    return new Response(new Uint8Array([255, 216]), {
      headers: {'content-type': 'image/jpeg'},
    });
  };
  try {
    const result = await loader({
      request: new Request(
        'https://example.com/api/nature-imagery?layer=base&bbox=-70,15,-63,22',
      ),
    });
    assert.equal(result.status, 200);
    assert.equal(result.headers.get('X-Imagery-Date'), 'historical-composite');
  } finally {
    globalThis.fetch = original;
  }
});
