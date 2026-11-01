import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseRoomPlanDocument, placeDraggedItem} from '../app/components/roomStudioPlan.ts';

const example = () => ({
  version: 1, accuracy: 'manual-estimate',
  plan: {width: 4.5, depth: 3.6, height: 2.5, items: [
    {id: 'planter-1', kind: 'planter', x: 1, y: 1.5, width: 0.45, depth: 0.45, rotation: 90,
      productId: 'gid://shopify/Product/123', mount: 'none', mountVerified: false},
  ]},
});
const malformed = (change) => {const data = example(); change(data); return data;};

test('export/import round trip keeps geometry, rotation and safe product references', () => {
  const source = example();
  const loaded = parseRoomPlanDocument(JSON.parse(JSON.stringify(source)));
  assert.deepEqual(loaded, source.plan);
  assert.notStrictEqual(loaded, source.plan);
});

test('rejects invalid versions, dimensions, shapes, duplicate IDs, geometry and optional fields', () => {
  const changes = [
    d => {d.version = 2;},
    d => {d.plan = null;},
    d => {d.plan.width = '10';},
    d => {d.plan.height = Infinity;},
    d => {d.plan.items = {};},
    d => {d.plan.items = Array.from({length: 201}, (_, i) => ({...d.plan.items[0], id: 'i-' + i}));},
    d => {d.plan.items.push({...d.plan.items[0]});},
    d => {d.plan.items[0].id = '';},
    d => {d.plan.items[0].kind = 'script';},
    d => {d.plan.items[0].x = -1;},
    d => {d.plan.items[0].y = 100;},
    d => {d.plan.items[0].width = 0;},
    d => {d.plan.items[0].rotation = '90';},
    d => {d.plan.items[0].rotation = 10_000;},
    d => {d.plan.items[0].productId = {};},
    d => {d.plan.items[0].mount = '__proto__';},
    d => {d.plan.items[0].mountVerified = 'true';},
  ];
  for (const change of changes) assert.equal(parseRoomPlanDocument(malformed(change)), null);
  assert.equal(parseRoomPlanDocument(null), null);
  assert.equal(parseRoomPlanDocument([]), null);
});

test('strips unexpected fields without changing trusted plan data', () => {
  const data = example(); data.plan.items[0].injected = '<script>alert(1)</script>';
  data.plan.unexpected = 12;
  const plan = parseRoomPlanDocument(data);
  assert.equal(Object.hasOwn(plan.items[0], 'injected'), false);
  assert.equal(Object.hasOwn(plan, 'unexpected'), false);
});

test('dragging keeps grab offset, snaps to 5cm and never mutates undo snapshot', () => {
  const initial = example().plan;
  const result = placeDraggedItem(initial, 'planter-1', {x: 2.13, y: 2.18}, {x: 0.2, y: -0.1}, true);
  assert.deepEqual({x: result.items[0].x, y: result.items[0].y}, {x: 1.95, y: 2.3});
  assert.deepEqual({x: initial.items[0].x, y: initial.items[0].y}, {x: 1, y: 1.5});
  assert.equal(placeDraggedItem(result, 'planter-1', {x: 2.15, y: 2.2}, {x: 0.2, y: -0.1}, true), result);
});

test('touch/pointer coordinates are clamped and unknown objects do not change plan', () => {
  const initial = example().plan;
  const result = placeDraggedItem(initial, 'planter-1', {x: 100, y: -5}, {x: 0.1, y: 0}, false);
  assert.equal(result.items[0].x, initial.width);
  assert.equal(result.items[0].y, 0);
  assert.strictEqual(placeDraggedItem(initial, 'missing-id', {x: 1, y: 1}, {x: 0, y: 0}, true), initial);
});
