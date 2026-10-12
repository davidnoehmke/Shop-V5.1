'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('sections/leafer-substrate-selector.liquid', 'utf8');
const runtime = source.split('{% javascript %}')[1].split('{% endjavascript %}')[0];
const locale = language => JSON.parse(fs.readFileSync(
  language === 'de' ? 'locales/de.default.json' : 'locales/en.json', 'utf8'
).replace(/^\s*\/\*[\s\S]*?\*\/\s*/, ''));
const profiles = [
  ['Aroids / Tropical', 'Aroids / Tropical'],
  ['Kräuter & Balkon', 'Herbs & Balcony'],
  ['Kakteen & Sukkulenten', 'Cacti & Succulents'],
  ['Orchideen', 'Orchids'],
  ['Palmen & Grünpflanzen', 'Palms & Green Plants'],
  ['Anzucht & Jungpflanzen', 'Seed Starting & Seedlings']
];

function node() {
  return {
    dataset: {}, disabled: true, hidden: false, value: '', textContent: '', children: [],
    style: {setProperty() {}},
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; },
    cloneNode() { return node(); }
  };
}

function selector(language, volumeOption) {
  let Selector;
  vm.runInNewContext(runtime, {
    HTMLElement: class {},
    document: {createElement: node, createDocumentFragment: node, createTextNode: text => ({textContent: text})},
    customElements: {get() {}, define(_tag, constructor) { Selector = constructor; }},
    window: {history: {}, location: {href: `https://leaferservice.com/${language === 'en' ? 'en/' : ''}`}}
  });
  const instance = new Selector();
  instance.dataset = {
    locale: language, currency: 'EUR', profileOption: language === 'de' ? 'Pflanzentyp' : 'Plant type',
    volumeOption, availableLabel: language === 'de' ? 'Verfügbar' : 'Available',
    unavailableLabel: language === 'de' ? 'Nicht verfügbar' : 'Unavailable',
    addLabel: language === 'de' ? 'In den Warenkorb' : 'Add to cart',
    soldOutLabel: language === 'de' ? 'Ausverkauft' : 'Sold out'
  };
  instance.i18n = locale(language).substrate_selector;
  instance.matrix = {version: 'locale-fixture-v1', basis: 'Volumenanteile', recipes: {}};
  for (const [canonical] of profiles) {
    instance.matrix.recipes[canonical] = {
      percent: {Kokosfasern: 55, Perlite: 25, Wurmhumus: 20},
      sizes_l: Object.fromEntries([2, 5, 10].map(litres => [String(litres), {
        Kokosfasern: litres * .55, Perlite: litres * .25, Wurmhumus: litres * .2
      }]))
    };
  }
  const nodes = Object.fromEntries([
    'property-profile', 'property-volume', 'property-recipe', 'property-version',
    'selection-summary', 'recipe-selection', 'base-recipe-selection', 'recipe-total',
    'recipe-basis', 'recipe-version', 'recipe-empty', 'recipe-notes', 'availability', 'submit'
  ].map(key => [`[data-${key}]`, node()]));
  const lists = [node(), node()];
  const price = node();
  instance.querySelector = key => nodes[key] || null;
  instance.querySelectorAll = key => key === '[data-selected-price]' ? [price] : lists;
  instance.nativeSelect = node();
  instance.customSegments = [];
  instance.profileChoices = profiles.map(pair => ({value: pair[language === 'de' ? 0 : 1], checked: false}));
  instance.volumeChoices = [2, 5, 10].map(litres => ({value: `${litres} L`, checked: false}));
  instance.variants = profiles.flatMap((pair, profileIndex) => [2, 5, 10].map((litres, sizeIndex) => ({
    id: 1000 + profileIndex * 10 + sizeIndex, price: 1234, available: true,
    options: {[instance.dataset.profileOption]: pair[language === 'de' ? 0 : 1], [volumeOption]: `${litres} L`}
  })));
  return {instance, nodes, price};
}

for (const [language, volumeOption] of [['de', 'Menge'], ['en', 'Quantity'], ['en', 'Volume']]) {
  test(`configurator ${language}/${volumeOption}: all six profiles and three sizes produce cart-ready recipes`, () => {
    const {instance, nodes, price} = selector(language, volumeOption);
    for (const variant of instance.variants) {
      instance.profileChoices.forEach(choice => { choice.checked = choice.value === variant.options[instance.dataset.profileOption]; });
      instance.volumeChoices.forEach(choice => { choice.checked = choice.value === variant.options[volumeOption]; });
      instance.updateFromChoices();
      const profile = variant.options[instance.dataset.profileOption];
      const volume = variant.options[volumeOption];
      const expected = language === 'de'
        ? ['Kokosfasern', 'Perlite', 'Wurmhumus'] : ['Coconut fibre', 'Perlite', 'Worm castings'];
      const recipe = nodes['[data-property-recipe]'].value;
      assert.equal(instance.nativeSelect.value, String(variant.id));
      assert.equal(nodes['[data-property-profile]'].value, profile);
      assert.equal(nodes['[data-property-volume]'].value, volume);
      assert.equal(nodes['[data-property-version]'].value, 'locale-fixture-v1');
      assert.equal(nodes['[data-recipe-total]'].textContent, `100 % · ${volume}`);
      assert.ok(instance.recipeForProfile(profile), `missing recipe for ${profile}`);
      for (const name of expected) assert.ok(recipe.includes(name), `${profile}: missing ${name}`);
      const amounts = [...recipe.matchAll(/\(([\d.,]+) L\)/g)].map(match => Number(match[1].replace(',', '.')));
      assert.equal(amounts.length, 3);
      assert.ok(amounts.every(amount => amount > 0));
      assert.ok(Math.abs(amounts.reduce((sum, amount) => sum + amount, 0) - Number.parseInt(volume)) < .001);
      for (const key of ['profile', 'volume', 'recipe', 'version']) assert.equal(nodes[`[data-property-${key}]`].disabled, false);
      assert.equal(nodes['[data-submit]'].disabled, false);
      assert.equal(nodes['[data-submit]'].textContent, instance.dataset.addLabel);
      assert.ok(price.textContent.includes(language === 'de' ? '12,34' : '12.34'));
      assert.doesNotMatch(recipe, /undefined|NaN|Translation missing/);
    }
    instance.updateVariant({...instance.variants[0], available: false}, false);
    assert.equal(nodes['[data-submit]'].disabled, true);
    assert.equal(nodes['[data-submit]'].textContent, instance.dataset.soldOutLabel);
  });
}

test('every literal configurator translation resolves to nonempty DE/EN text with matching placeholders', () => {
  const keys = [...new Set([...source.matchAll(/'((?:substrate_selector|home\.solution)\.[^']+)'\s*\|\s*t\b/g)].map(match => match[1]))];
  const read = (data, key) => key.split('.').reduce((value, part) => value?.[part], data);
  const placeholders = value => [...value.matchAll(/\{\{\s*(\w+)\s*\}\}|\[([a-z_]+)\]/gi)].map(match => match[1] || match[2]).sort();
  const de = locale('de'), en = locale('en');
  assert.ok(keys.length > 20, 'translation scan must cover the configurator');
  for (const key of keys) {
    const german = read(de, key), english = read(en, key);
    for (const value of [german, english]) {
      assert.equal(typeof value, 'string', key);
      assert.ok(value.trim(), key);
      assert.doesNotMatch(value, /Translation missing/i, key);
    }
    assert.deepEqual(placeholders(english), placeholders(german), `${key}: placeholder mismatch`);
  }
});
