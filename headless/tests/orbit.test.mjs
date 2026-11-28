import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  boundedCamera,
  orbitPoint,
  orbitLocation,
  approachCamera,
} from '../app/lib/orbit.ts';
test('zoom remains within range and longitude crosses the date line smoothly', () => {
  assert.deepEqual(boundedCamera({lat: 100, lon: 181, zoom: 100}), {
    lat: 89,
    lon: -179,
    zoom: 24,
  });
  assert.equal(boundedCamera({lat: 0, lon: 0, zoom: 0.01}).zoom, 1);
  assert.ok(
    Math.abs(
      approachCamera(
        {lat: 0, lon: 179, zoom: 1},
        {lat: 0, lon: -179, zoom: 2},
        0.5,
      ).lon,
    ) === 180,
  );
});
test('taps unproject to the rendered position at every supported zoom', () => {
  for (const zoom of [1, 2, 6, 24]) {
    const camera = {lat: 30, lon: 150, zoom};
    const point = orbitPoint(31, 151, camera);
    const hit = orbitLocation(
      (parseFloat(point.left) - 50) / 50,
      (50 - parseFloat(point.top)) / 50,
      camera,
    );
    assert.ok(Math.abs(hit.lat - 31) < 0.000001);
    assert.ok(Math.abs(hit.lon - 151) < 0.000001);
  }
  assert.equal(orbitLocation(1, 1, {lat: 0, lon: 0, zoom: 1}), null);
  assert.equal(orbitPoint(0, 180, {lat: 0, lon: 0, zoom: 1}), null);
});

test('full-screen projection and picking agree in portrait, landscape and desktop layouts', async () => {
  const {viewportLocation, detailBounds} = await import('../app/lib/orbit.ts');
  for (const viewport of [
    {width: 390, height: 844},
    {width: 844, height: 390},
    {width: 1440, height: 900},
  ]) {
    for (const zoom of [1, 4, 24]) {
      const camera = {lat: 18, lon: -66, zoom};
      const point = orbitPoint(18.2, -65.8, camera, viewport);
      const hit = viewportLocation(
        (parseFloat(point.left) / 100) * viewport.width,
        (parseFloat(point.top) / 100) * viewport.height,
        viewport,
        camera,
      );
      assert.ok(Math.abs(hit.lat - 18.2) < 0.000001);
      assert.ok(Math.abs(hit.lon + 65.8) < 0.000001);
    }
  }
  const bounds = detailBounds({lat: 88, lon: 179, zoom: 24});
  assert.ok(
    bounds[0] >= -180 &&
      bounds[2] <= 180 &&
      bounds[1] >= -90 &&
      bounds[3] <= 90,
  );
  assert.ok(bounds[0] < bounds[2] && bounds[1] < bounds[3]);
});
