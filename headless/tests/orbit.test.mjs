import {test} from 'node:test';
import assert from 'node:assert/strict';
import {boundedCamera, orbitPoint, orbitLocation, approachCamera} from '../app/lib/orbit.ts';
test('zoom remains within range and longitude crosses the date line smoothly', () => {
  assert.deepEqual(boundedCamera({lat: 100, lon: 181, zoom: 100}), {lat: 89, lon: -179, zoom: 24});
  assert.equal(boundedCamera({lat: 0, lon: 0, zoom: .01}).zoom, 1);
  assert.ok(Math.abs(approachCamera({lat: 0, lon: 179, zoom: 1}, {lat: 0, lon: -179, zoom: 2}, .5).lon) === 180);
});
test('taps unproject to the rendered position at every supported zoom', () => {
  for (const zoom of [1, 2, 6, 24]) {
    const camera = {lat: 30, lon: 150, zoom};
    const point = orbitPoint(31, 151, camera);
    const hit = orbitLocation((parseFloat(point.left)-50)/50, (50-parseFloat(point.top))/50, camera);
    assert.ok(Math.abs(hit.lat-31) < .000001);
    assert.ok(Math.abs(hit.lon-151) < .000001);
  }
  assert.equal(orbitLocation(1, 1, {lat: 0, lon: 0, zoom: 1}), null);
  assert.equal(orbitPoint(0, 180, {lat: 0, lon: 0, zoom: 1}), null);
});
