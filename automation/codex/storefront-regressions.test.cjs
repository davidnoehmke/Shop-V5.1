const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');

const source = fs.readFileSync('supabase/functions/storefront-assistant/index.ts', 'utf8');
const helpers = source.slice(source.indexOf('function clean('), source.indexOf('async function contextFor('))
  + source.slice(source.indexOf('function fallbackAnswer('), source.indexOf('function outputText('));
const scope = vm.createContext({});
vm.runInContext(stripTypeScriptTypes(helpers), scope);

test('Bims question excludes generic question words and matches the ingredient', () => {
  const needles = scope.tokens('Was macht Bims im Substrat?');
  assert.deepEqual(Array.from(needles), ['bims', 'substrat']);
  const bims = scope.scoreText(['Bims – mineralischer Substratzusatz'], needles);
  const mat = scope.scoreText(['Wasserdichte Umtopfmatte für sauberes Umtopfen und Mischen'], needles);
  assert.equal(mat, 0);
  assert.ok(bims > mat);
  assert.ok(scope.scoreText(['Kräuter'], scope.tokens('Für Kräuter')) > 0);
});

test('approved knowledge answers precede a product advertisement', () => {
  assert.equal(scope.fallbackAnswer({ knowledge: [{ answer: 'Bims lockert die Mischung.' }], products: [{ canonical_title: 'Umtopfmatte', intro: 'Wasserdicht' }] }, 'de'), 'Bims lockert die Mischung.');
  assert.match(scope.fallbackAnswer({ knowledge: [], products: [] }, 'de'), /keine freigegebene/);
});

test('pro recipe and volume are enabled on the submitted product form', () => {
  const liquid = fs.readFileSync('sections/leafer-substrate-selector.liquid', 'utf8');
  let Selector;
  vm.runInNewContext(liquid.split('{% javascript %}')[1].split('{% endjavascript %}')[0], {
    HTMLElement: class {}, customElements: { get() {}, define(name, value) { Selector = value; } }
  });
  const fields = Object.fromEntries(['profile', 'volume', 'recipe', 'version'].map(key => [`[data-property-${key}]`, { disabled: true, value: '' }]));
  const instance = new Selector();
  instance.querySelector = key => fields[key];
  instance.setProperty('[data-property-recipe]', 'Pinienrinde 50 % (1 L) · Bims 50 % (1 L)');
  instance.setProperty('[data-property-volume]', '2 L');
  assert.equal(fields['[data-property-recipe]'].disabled, false);
  assert.match(fields['[data-property-recipe]'].value, /Bims 50/);
  assert.equal(fields['[data-property-volume]'].value, '2 L');
  assert.match(liquid, /class: 'leafer-substrate__form js-leafer-cart-form'/);
  assert.match(fs.readFileSync('layout/theme.liquid', 'utf8'), /cart-forms\.js/);
});


test('pro mixer exposes per-component sliders and material previews', () => {
  const liquid = fs.readFileSync('sections/leafer-substrate-selector.liquid', 'utf8');
  assert.match(liquid, /data-custom-slider-list/);
  assert.match(liquid, /data-custom-segment-slider/);
  assert.match(liquid, /component_product\.featured_image/);
  assert.match(liquid, /balanceCustomSegment\(selected, rawValue\)/);
  assert.doesNotMatch(liquid, /data-custom-share-slider/);
});


test('homepage mixer supports bounded auto-balance and visual drag ordering', () => {
  const liquid = fs.readFileSync('sections/leafer-substrate-selector.liquid', 'utf8');
  const index = JSON.parse(fs.readFileSync('templates/index.json', 'utf8'));
  assert.match(liquid, /leafer-substrate--home-usp/);
  assert.match(liquid, /pointerdown/);
  assert.match(liquid, /reorderCustomSegments\(dragged, clientY\)/);
  assert.match(liquid, /moveCustomSegment\(segment, direction\)/);
  assert.match(liquid, /100 - othersMax/);
  assert.match(liquid, /touch-action: none/);
  assert.match(liquid, /data-order=/);
  assert.deepEqual(index.order.slice(0, 4), ['hero', 'substrate_configurator', 'home_collection_journey', 'trust']);
  assert.match(index.sections.home_collection_journey.settings.heading, /Wurzelraum/);
  assert.match(index.sections.substrate_configurator.settings.intro, /Drag & Drop/);
});


test('pro mixer is capped at four components across UI and locale copy', () => {
  const liquid = fs.readFileSync('sections/leafer-substrate-selector.liquid', 'utf8');
  const de = JSON.parse(fs.readFileSync('locales/de.default.json', 'utf8'));
  const en = JSON.parse(fs.readFileSync('locales/en.json', 'utf8'));
  const index = fs.readFileSync('templates/index.json', 'utf8');
  const substrateWorld = fs.readFileSync('templates/page.substratewelt.json', 'utf8');
  assert.match(liquid, /data-max-components="4"/);
  assert.match(liquid, /\{% for pot_index in \(1\.\.4\) %\}/);
  assert.match(liquid, /data-customizer-count>0<\/b>\/4<\/span>/);
  assert.match(liquid, /activeCustomSegments\(\)\.length >= this\.maxCustomComponents/);
  assert.doesNotMatch(liquid, /bis zu fünf Komponenten/i);
  assert.match(de.configurator.advanced.intro, /vier Komponenten/i);
  assert.match(en.configurator.advanced.intro, /four components/i);
  assert.match(index, /bis zu vier Bestandteile/i);
  assert.doesNotMatch(substrateWorld, /bis zu fünf auswählbare Komponenten/i);
});

test('layer reordering preserves shares while slider balancing stays at 100 percent', () => {
  const liquid = fs.readFileSync('sections/leafer-substrate-selector.liquid', 'utf8');
  let Selector;
  vm.runInNewContext(liquid.split('{% javascript %}')[1].split('{% endjavascript %}')[0], {
    HTMLElement: class {},
    customElements: { get() {}, define(name, value) { Selector = value; } }
  });
  const makeSegment = (name, index, order, share, top) => ({
    hidden: false,
    dataset: {
      name,
      index: String(index),
      order: String(order),
      share: String(share),
      proMin: '0',
      proMax: '100'
    },
    getBoundingClientRect() { return { top, height: 40 }; }
  });
  const a = makeSegment('A', 0, 0, 25, 20);
  const b = makeSegment('B', 1, 1, 25, 70);
  const c = makeSegment('C', 2, 2, 25, 120);
  const d = makeSegment('D', 3, 3, 25, 170);
  const instance = new Selector();
  instance.customSegments = [a, b, c, d];
  instance.updateCustomSegmentVisuals = () => {};
  instance.updateCustomSliderValues = () => {};
  instance.updateProFeedback = () => {};
  instance.renderCustomSliders = () => {};
  instance.refreshCustomRecipe = () => {};

  instance.balanceCustomSegment(a, 40);
  assert.equal(instance.customSegments.reduce((sum, segment) => sum + Number(segment.dataset.share), 0), 100);
  const before = Object.fromEntries(instance.customSegments.map(segment => [segment.dataset.name, segment.dataset.share]));

  instance.visualCustomSegments = () => [a, b, c, d];
  instance.reorderCustomSegments(d, 5);
  const after = Object.fromEntries(instance.customSegments.map(segment => [segment.dataset.name, segment.dataset.share]));
  assert.deepEqual(after, before);
  assert.equal(d.dataset.order, '3');
  assert.match(liquid, /event\.pointerType === 'mouse'/);
  assert.match(liquid, /event\.type !== 'pointercancel'/);
  assert.match(liquid, /touch-action: none/);
});

test('SSOT component profile JSON falls back when metaobject reference is absent', () => {
  const liquid = fs.readFileSync('sections/leafer-substrate-selector.liquid', 'utf8');
  assert.match(liquid, /component_profile_data/);
  assert.match(liquid, /component_profile_data\.min_percent/);
  assert.match(liquid, /component_profile_data\.max_percent/);
  assert.match(liquid, /component_profile_data\.aeration/);
  assert.match(liquid, /component_profile_data\.structure/);
  assert.match(liquid, /data-pro-max="{{ pro_max }}"/);
});
