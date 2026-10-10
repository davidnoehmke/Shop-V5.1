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
  assert.match(scope.fallbackAnswer({ knowledge: [], products: [] }, 'de'), /möchte ich dir nichts Falsches sagen/);
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
  const parseShopifyJson = path => JSON.parse(fs.readFileSync(path, 'utf8').replace(/^\/\*[\s\S]*?\*\/\s*/, ''));
  const de = parseShopifyJson('locales/de.default.json');
  const en = parseShopifyJson('locales/en.json');
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

test('mobile pro mixer keeps the pot above a readable vertical component list', () => {
  const liquid = fs.readFileSync('sections/leafer-substrate-selector.liquid', 'utf8');
  const potDesktop = liquid.indexOf('.leafer-substrate--home-usp .leafer-substrate__pot-slider { width: min(100%, 250px); height: 330px; }');
  const responsive = liquid.indexOf('@media (max-width: 620px) {\n    .leafer-substrate__advanced-summary');
  assert.ok(potDesktop > -1 && responsive > potDesktop, 'mobile pot sizing must override the desktop homepage rule');
  const mobile = liquid.slice(responsive, liquid.indexOf('@media (max-width: 620px) and (max-height: 700px)', responsive));
  assert.match(mobile, /customizer-grid \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(mobile, /custom-options \{[^}]*display: grid; grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(mobile, /custom-option \{[^}]*min-width: 0;[^}]*width: 100%/);
  assert.doesNotMatch(mobile, /custom-options \{[^}]*overflow-x: auto/);
  assert.match(mobile, /home-usp \.leafer-substrate__pot-slider \{[^}]*height: clamp\(165px, 26svh, 220px\)/);
  assert.match(liquid, /The pot visualises loose substrate, never packaged product photography/);
});

test('mobile mixer scrolls ingredient choices vertically and keeps share ranges vertical', () => {
  const liquid = fs.readFileSync('sections/leafer-substrate-selector.liquid', 'utf8');
  const mobile = liquid.slice(liquid.indexOf('@media (max-width: 620px) {\n    .leafer-substrate__advanced-summary'));
  assert.match(mobile, /custom-options \{[^}]*overflow-y: auto/);
  assert.match(mobile, /custom-options \{[^}]*scroll-snap-type: y proximity/);
  assert.match(mobile, /mix-slider input \{[^}]*writing-mode: vertical-lr/);
  assert.match(liquid, /mix-slider input \{[^}]*cursor: ew-resize/);
  assert.match(liquid, /data-custom-slider-list/);
  const de = JSON.parse(fs.readFileSync('locales/de.default.json', 'utf8').replace(/^\/\*[\s\S]*?\*\/\s*/, ''));
  const en = JSON.parse(fs.readFileSync('locales/en.json', 'utf8').replace(/^\/\*[\s\S]*?\*\/\s*/, ''));
  assert.ok(de.substrate_selector.component_scroll_hint);
  assert.ok(en.substrate_selector.component_scroll_hint);
});

test('pot stays flat, texture-free and rounded while retaining drag reordering', () => {
  const liquid = fs.readFileSync('sections/leafer-substrate-selector.liquid', 'utf8');
  const pot = liquid.match(/\.leafer-substrate__pot-slider \{[^}]+\}/)?.[0] || '';
  assert.match(pot, /border-radius: 24px 24px 40px 40px/);
  assert.match(pot, /mask-image:/);
  assert.doesNotMatch(pot, /linear-gradient|polygon\(/);
  assert.doesNotMatch(liquid, /materialTexture\(/);
  assert.match(liquid, /materialColor\(/);
  assert.match(liquid, /reorderCustomSegments\(dragged, clientY\)/);
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


test('German and English locale keys stay in parity', () => {
  const parseShopifyJson = path => JSON.parse(fs.readFileSync(path, 'utf8').replace(/^\/\*[\s\S]*?\*\/\s*/, ''));
  const flattenKeys = (value, prefix = '', out = []) => {
    for (const [key, child] of Object.entries(value)) {
      const next = prefix ? `${prefix}.${key}` : key;
      if (child && typeof child === 'object' && !Array.isArray(child)) flattenKeys(child, next, out);
      else out.push(next);
    }
    return out.sort();
  };
  const de = flattenKeys(parseShopifyJson('locales/de.default.json'));
  const en = flattenKeys(parseShopifyJson('locales/en.json'));
  assert.deepEqual(en, de);
});

test('English plant profiles resolve canonical recipes with nonzero litre amounts', () => {
  const liquid = fs.readFileSync('sections/leafer-substrate-selector.liquid', 'utf8');
  let Selector;
  const node = () => ({ style: { setProperty() {} }, append() {}, replaceChildren() {}, cloneNode() { return node(); } });
  vm.runInNewContext(liquid.split('{% javascript %}')[1].split('{% endjavascript %}')[0], {
    HTMLElement: class {},
    document: { createElement: node, createDocumentFragment: node },
    customElements: { get() {}, define(name, value) { Selector = value; } }
  });
  const instance = new Selector();
  instance.dataset = { locale: 'en' };
  instance.matrix = { recipes: { 'Kräuter & Balkon': {
    percent: { Kokosfasern: 55, Perlite: 25, Wurmhumus: 20 },
    sizes_l: { '5': { Kokosfasern: 2.75, Perlite: 1.25, Wurmhumus: 1 } }
  } } };
  const nodes = Object.fromEntries(['empty', 'total', 'basis', 'version', 'notes', 'base-recipe-selection'].map(key => [`[data-recipe-${key}]`, node()]));
  instance.querySelector = selector => nodes[selector];
  instance.querySelectorAll = () => [node(), node()];
  instance.formatNumber = value => String(value);
  instance.renderNotes = () => {};
  const recipe = instance.renderRecipe('Herbs & Balcony', '5 L');
  assert.equal(recipe, 'Coconut fibre 55 % (2.75 L) · Perlite 25 % (1.25 L) · Worm castings 20 % (1 L)');
  assert.equal(nodes['[data-recipe-total]'].textContent, '100 % · 5 L');
  assert.equal(instance.recipeForProfile('Kräuter & Balkon'), instance.recipeForProfile('Herbs & Balcony'));
  assert.equal(instance.recipeForProfile('Unknown'), undefined);
  // The live English product uses Quantity, while the translated theme setting uses Volume.
  assert.match(liquid, /when 'Menge', 'Quantity', 'Volume'\s+assign volume_option_name = product_option.name/);
});

test('interior zone transitions decode translated entities before safe text output', () => {
  const liquid = fs.readFileSync('sections/leaf-interior-story.liquid', 'utf8');
  const decoder = liquid.slice(liquid.indexOf('  const entities ='), liquid.indexOf('  zones.forEach'));
  const context = vm.createContext({});
  vm.runInContext(decoder + '\nglobalThis.decode = plainText;', context);
  assert.equal(context.decode('Planter &amp; substrate'), 'Planter & substrate');
  assert.equal(context.decode('the plant&#39;s light requirement'), "the plant's light requirement");
  assert.equal(context.decode('&lt;img&gt;'), '<img>');
  assert.match(liquid, /kicker.textContent=zone.kicker/);
  assert.match(liquid, /zone.points.map\(p=>'<li>'\+esc\(p\)/);
});


test('shop assistant keeps photo upload unavailable while voice remains accessible', () => {
  const liquid = fs.readFileSync('snippets/leaf-shop-assistant.liquid', 'utf8');
  assert.match(liquid, /utterance\.rate = \.78/);
  assert.match(liquid, /payload\.speech/);
  assert.match(liquid, /this\.resumeVoice\(\)/);
  assert.doesNotMatch(liquid, /data-assistant-photo|type="file"/);
  assert.match(liquid, /data-assistant-voice/);
});


test('desktop assistant exposes hover actions and keeps the collapsed launcher away from the corner', () => {
  const liquid = fs.readFileSync('snippets/leaf-shop-assistant.liquid', 'utf8');
  assert.match(liquid, /data-assistant-action-chat/);
  assert.match(liquid, /data-assistant-action-voice/);
  assert.match(liquid, /@media \(min-width: 701px\)[\s\S]*leaf-shop-assistant:hover[\s\S]*leaf-shop-assistant__quick-actions/);
  assert.match(liquid, /right: max\(1\.5rem, env\(safe-area-inset-right\)\)/);
  assert.match(liquid, /bottom: max\(1\.5rem, env\(safe-area-inset-bottom\)\)/);
  assert.match(liquid, /leaf-shop-assistant\.is-open \.leaf-shop-assistant__quick-actions/);
});

test('voice assistant greets first, speaks slower and resumes listening after speech', () => {
  const liquid = fs.readFileSync('snippets/leaf-shop-assistant.liquid', 'utf8');
  assert.match(liquid, /data-voice-greeting=/);
  assert.match(liquid, /startVoiceConversation\(\)/);
  assert.match(liquid, /utterance\.rate = \.78/);
  assert.match(liquid, /preferredVoice\(utterance\.lang\)/);
  assert.match(liquid, /utterance\.onend[\s\S]*setTimeout\(\(\) => this\.resumeVoice\(\), 400\)/);
  assert.match(liquid, /voice: Boolean\(speakResponse\)/);
});

test('assistant locale parity includes desktop actions and a spoken greeting', () => {
  const parseShopifyJson = path => JSON.parse(fs.readFileSync(path, 'utf8').replace(/^\/\*[\s\S]*?\*\/\s*/, ''));
  const de = parseShopifyJson('locales/de.default.json').shop_assistant;
  const en = parseShopifyJson('locales/en.json').shop_assistant;
  for (const key of ['actions', 'action_chat', 'action_voice', 'action_photo', 'action_advisor', 'voice_greeting']) {
    assert.equal(typeof de[key], 'string');
    assert.equal(typeof en[key], 'string');
    assert.ok(de[key].length > 0);
    assert.ok(en[key].length > 0);
  }
});

test('spoken assistant requests use conversational server instructions', () => {
  const assistant = fs.readFileSync('supabase/functions/storefront-assistant/index.ts', 'utf8');
  assert.match(assistant, /const voiceMode = body\?\.voice === true/);
  assert.match(assistant, /This is an active spoken conversation/);
  assert.match(assistant, /warm, natural and human/);
});


test('assistant product links encode verified handles and preserve the storefront locale', () => {
  assert.equal(scope.productHref('soltech-grove™-led-grow-light', 'de'), '/products/soltech-grove%E2%84%A2-led-grow-light');
  assert.equal(scope.productHref('soltech-grove™-led-grow-light', 'en'), '/en/products/soltech-grove%E2%84%A2-led-grow-light');
  assert.equal(scope.productHref('../outside', 'de'), '');
  assert.equal(scope.productHref('bad/handle', 'de'), '');
  const links = scope.productLinks([{ canonical_title: 'Soltech Grove™ LED Grow Light', handle: 'soltech-grove™-led-grow-light' }], 'en');
  assert.deepEqual(JSON.parse(JSON.stringify(links)), [{
    label: 'Soltech Grove™ LED Grow Light',
    href: '/en/products/soltech-grove%E2%84%A2-led-grow-light'
  }]);
});

test('assistant frontend accepts only same-origin encoded product links', () => {
  const liquid = fs.readFileSync('snippets/leaf-shop-assistant.liquid', 'utf8');
  assert.match(liquid, /new URL\(link\.href, location\.origin\)/);
  assert.match(liquid, /target\.origin !== location\.origin/);
  assert.match(liquid, /\^\\\/\(\?:en\\\/\)\?products\\\/\[\^\/\?\#\]\+\$/);
  assert.doesNotMatch(liquid, /\^\\\/products\\\/\[a-z0-9-\]\+\$/i);
});


test('assistant excludes products with fact-critical readiness blockers', () => {
  assert.equal(scope.hasCriticalProductBlocker([{ rule: 'identity_confirmed' }]), true);
  assert.equal(scope.hasCriticalProductBlocker([{ rule: 'supplier_confirmed' }]), true);
  assert.equal(scope.hasCriticalProductBlocker([{ rule: 'safety_reviewed' }]), true);
  assert.equal(scope.hasCriticalProductBlocker([{ rule: 'content_evidence_present' }]), true);
  assert.equal(scope.hasCriticalProductBlocker([{ rule: 'seo_title_present' }, { rule: 'media_present' }, { rule: 'inventory_sellable' }]), false);
  assert.equal(scope.hasCriticalProductBlocker([]), false);
});


test('assistant factual context requires sourced approved knowledge and sourced articles', () => {
  const assistant = fs.readFileSync('supabase/functions/storefront-assistant/index.ts', 'utf8');
  assert.match(assistant, /refs\.length > 0 && Number\(row\.factuality_score \|\| 0\) >= 0\.9/);
  assert.match(assistant, /Array\.isArray\(row\.source_citations\) && row\.source_citations\.length > 0/);
  assert.doesNotMatch(assistant, /if \(!hasImage\) return true;/);
});
