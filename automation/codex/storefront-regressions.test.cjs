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
