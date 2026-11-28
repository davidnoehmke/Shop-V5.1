import {test} from 'node:test';
import assert from 'node:assert/strict';
import {zoomKnowledge, validStages} from '../app/lib/zoom-knowledge.ts';
const stages = [
  'world',
  'region',
  'climate',
  'plants',
  'topsoil',
  'subsoil',
].map((id, i) => ({
  id,
  min_zoom: [1, 2, 3.8, 7, 12, 18][i],
  question_de: id,
  answer_de: id,
  source_citations: [{url: 'https://example.com', label: 'Source'}],
}));
const region = {
  slug: 'site',
  center_lat: 18,
  center_lon: -66,
  explorer_data: {zoom_story: stages},
};
test('zoom changes topic in both directions and supports skipping levels', () => {
  for (const [zoom, expected] of [
    [1, 'world'],
    [4, 'climate'],
    [20, 'subsoil'],
    [8, 'plants'],
    [2.1, 'region'],
  ]) {
    assert.equal(
      zoomKnowledge([region], {lat: 18, lon: -66, zoom}).stage.id,
      expected,
    );
  }
});
test('regional facts are limited to the nearby region, global facts remain available', () => {
  const result = zoomKnowledge([region], {lat: -45, lon: 90, zoom: 20});
  assert.equal(result.region, undefined);
  assert.equal(result.stage.id, 'world');
});
test('source-free, malformed and out-of-range topics are excluded', () => {
  assert.deepEqual(
    validStages({
      ...region,
      explorer_data: {
        zoom_story: [
          {...stages[0], source_citations: []},
          {...stages[1], min_zoom: 99},
        ],
      },
    }),
    [],
  );
  assert.equal(zoomKnowledge([], {lat: 0, lon: 0, zoom: 1}).stage, undefined);
});
test('nearest site is selected across the date line', () => {
  const site = {...region, center_lat: 0, center_lon: 179};
  assert.equal(
    zoomKnowledge([site], {lat: 0, lon: -179, zoom: 10}).region.slug,
    'site',
  );
});

test('small wheel movements at a boundary preserve the current explanation', () => {
  const before = zoomKnowledge([region], {lat: 18, lon: -66, zoom: 3.7});
  assert.equal(
    zoomKnowledge([region], {lat: 18, lon: -66, zoom: 3.9}, before).stage.id,
    'region',
  );
  const after = zoomKnowledge([region], {lat: 18, lon: -66, zoom: 4.2}, before);
  assert.equal(after.stage.id, 'climate');
  assert.equal(
    zoomKnowledge([region], {lat: 18, lon: -66, zoom: 3.7}, after).stage.id,
    'climate',
  );
  assert.equal(
    zoomKnowledge([region], {lat: 18, lon: -66, zoom: 3.4}, after).stage.id,
    'region',
  );
  assert.equal(
    zoomKnowledge([region], {lat: 18, lon: -66, zoom: 20}, before).stage.id,
    'subsoil',
  );
});
