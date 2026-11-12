const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync(require('node:path').join(__dirname, '../../assets/leaf-led-filters.js'), 'utf8');
function fixture(search = '', hash = '') {
  const node = (dataset = {}, id = '') => ({ dataset, id, hidden: false, listeners: {}, attrs: {},
    classList: { toggle() {} }, setAttribute(k,v) { this.attrs[k] = v; },
    addEventListener(k,v) { this.listeners[k] = v; }, click() { this.listeners.click(); },
    closest() { return this.card || this; }, matches(s) { return s === 'details' && this.isDetails; }
  });
  const cards = [node({ ledFormat: 'bulb', search: 'e27 winter', watts: '7' }, 'bulb'), node({ ledFormat: 'set', search: 't8 regal winter', watts: '16' }, 'set'), node({ ledFormat: 'fixture', search: 'regal leiste', watts: '25' }, 'fixture')];
  const buttons = ['all','e27','shelf','winter'].map(ledFilter => node({ ledFilter }));
  const formats = ['all','bulb','fixture','set','other'].map(ledFormatFilter => node({ ledFormatFilter }));
  const jumps = cards.map(c => node({ ledJump: c.id }));
  const count = node({ template: 'Angezeigte Produkte: [count]' });
  const empty = node(), formatGroup = node();
  const details = node({}, 'delivery'); details.isDetails = true; details.card = cards[1];
  const delivery = node(); delivery.hash = '#delivery';
  const elements = { '[data-led-card]':cards, '[data-led-filter]':buttons, '[data-led-format-filter]':formats, '[data-led-jump]':jumps, '[data-led-delivery]':[delivery] };
  const root = node(); root.querySelectorAll = s => elements[s] || [];
  root.querySelector = s => ({ '[data-led-count]':count, '[data-led-empty]':empty, '[data-led-formats]':formatGroup })[s];
  root.contains = c => cards.includes(c);
  const window = { location:{search, hash}, addEventListener(k,v) { this[k] = v; } };
  vm.runInNewContext(source, { document:{querySelectorAll:() => [root], getElementById:id=>[...cards,details].find(c=>c.id===id), addEventListener() {}}, window, URLSearchParams });
  return {cards, buttons, formats, jumps, count, empty, details, delivery, window};
}
test('format and usage filters intersect, update navigation, count and accessible state', () => {
  const f = fixture(); f.formats[1].click(); f.buttons[1].click();
  assert.deepEqual(f.cards.map(c=>!c.hidden), [true,false,false]);
  assert.deepEqual(f.jumps.map(c=>!c.hidden), [true,false,false]);
  assert.equal(f.count.textContent,'Angezeigte Produkte: 1');
  assert.equal(f.formats[1].attrs['aria-pressed'],'true');
  f.formats[3].click(); assert.equal(f.empty.hidden,false);
  f.buttons[0].click(); assert.deepEqual(f.cards.map(c=>!c.hidden),[false,true,false]);
  assert.equal(f.empty.hidden,true);
  assert.equal(f.formats[4].hidden,true);
});
test('valid URL filters work, invalid inputs keep all products visible', () => {
  assert.deepEqual(fixture('?led_format=set&led_use=winter').cards.map(c=>!c.hidden),[false,true,false]);
  assert.deepEqual(fixture('?led_format=invalid&led_use=invalid').cards.map(c=>!c.hidden),[true,true,true]);
});
test('deep links reveal hidden products and delivery link opens contents', () => {
  const f=fixture('?led_format=bulb','#delivery');
  assert.equal(f.cards[1].hidden,false); assert.equal(f.details.open,true);
  f.formats[1].click(); f.window.location.hash='#set'; f.window.hashchange();
  assert.equal(f.cards[1].hidden,false);
  f.details.open=false; f.delivery.click(); assert.equal(f.details.open,true);
});
