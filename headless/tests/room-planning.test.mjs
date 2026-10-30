import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {alternateLanguagePath} from '../app/lib/navigation.ts';

const registry = new Map();
vm.runInNewContext(readFileSync(new URL('../../assets/interieur-room-builder.js', import.meta.url), 'utf8'), {
  HTMLElement: class {}, customElements: {get: name => registry.get(name), define: (name, value) => registry.set(name, value)},
});
const Builder = registry.get('interieur-room-builder');
test('room positions stay bounded and projection remains finite after resize', () => {
  const builder = new Builder();
  builder.room = {width: 4, depth: 3, height: 2.5};
  const object = {x: 20, z: -20};
  builder.clampObject(object);
  assert.equal(object.x, 1.85);
  assert.equal(object.z, -1.35);
  builder.canvas = {width: 375, height: 300}; builder.camera = -35;
  const projected = builder.project(object.x, 1, object.z);
  assert.ok(Number.isFinite(projected.x) && Number.isFinite(projected.y));
});
test('duplication retains variant identity and deletion only removes selected object', () => {
  const builder = new Builder();
  builder.room = {width: 4, depth: 3}; builder.objectId = 1; builder.selectedId = 1;
  builder.objects = [{id: 1, x: 0, z: 0, variantId: 'gid://shopify/ProductVariant/123'}];
  builder.save = builder.draw = builder.updateSummary = () => {};
  builder.duplicateSelected();
  assert.equal(builder.objects.length, 2);
  assert.equal(builder.objects[1].variantId, builder.objects[0].variantId);
  assert.equal(builder.objects[1].id, 2);
  builder.deleteSelected();
  assert.equal(builder.objects.length, 1);
  assert.equal(builder.objects[0].id, 1);
});
test('planning, worlds and commerce switch languages without dropping parameters or anchors', () => {
  for (const de of ['/raumplanung#room-tour', '/raumplanung#room-planner', '/welten/licht', '/marken/venso', '/collections/interieur-solutions', '/products/lamp?variant=123', '/cart', '/blogs']) {
    assert.equal(alternateLanguagePath(alternateLanguagePath(de)), de);
  }
  assert.equal(alternateLanguagePath('/raumplanung#room-tour'), '/en/planning#room-tour');
  assert.equal(alternateLanguagePath('/'), '/en');
  assert.equal(alternateLanguagePath('/en'), '/');
});
