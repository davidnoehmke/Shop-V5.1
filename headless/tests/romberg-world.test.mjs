import test from 'node:test';
import assert from 'node:assert/strict';
import {groupRombergProducts, rombergCategory, rombergSummary, relatedRombergProducts, rombergSpecifications} from '../app/lib/romberg-world.ts';

test('Romberg products are grouped by real title and product type', () => {
  const products = [
    {title: 'Romberg BoQube S Zimmergewächshaus', productType: 'Anzuchtgewächshaus'},
    {title: 'Romberg Anzuchthaus L', productType: 'Anzuchtgewächshaus'},
    {title: 'Romberg Heizmatte S STYLE', productType: 'Anzuchtzubehör'},
    {title: 'Romberg Kokos-Quelltabletten 50', productType: 'Anzuchtsubstrat'},
  ];
  const groups = groupRombergProducts(products);
  assert.deepEqual(groups.map((item) => [item.key, item.products.length]), [
    ['boqube', 1], ['houses', 1], ['essentials', 2],
  ]);
  assert.equal(groups.flatMap((item) => item.products).length, products.length);
});

test('Empty Shopify assortment renders no artificial preview categories', () => {
  assert.deepEqual(groupRombergProducts([]), []);
});

test('Unknown category is still offered in essentials instead of disappearing', () => {
  assert.equal(rombergCategory({title: 'Romberg Neues Produkt', productType: 'Unbekannt'}), 'essentials');
});

test('Product summary preserves source text and fixes missing sentence spaces', () => {
  assert.equal(rombergSummary('BoQube S.Die Haube ist dabei.'), 'BoQube S. Die Haube ist dabei.');
  assert.ok(rombergSummary('Langes Wort '.repeat(50), 140).length <= 141);
});

test('Related items exclude the current product and favour complementary types', () => {
  const current = {handle: 'boqube-s', productType: 'Anzuchtgewächshaus'};
  const candidates = [
    current,
    {handle: 'boqube-m', productType: 'Anzuchtgewächshaus'},
    {handle: 'quelltabletten', productType: 'Anzuchtsubstrat'},
    {handle: 'heizmatte', productType: 'Anzuchtzubehör'},
  ];
  assert.deepEqual(relatedRombergProducts(candidates, current).map((item) => item.handle),
    ['quelltabletten', 'heizmatte', 'boqube-m']);
});

test('Technical facts are extracted only when actually in Shopify descriptions', () => {
  assert.deepEqual(
    rombergSpecifications('Romberg BoQube S', '28 × 12 × 13 cm und bis zu 8 Quelltabletten').map((x) => [x.key, x.value]),
    [['dimensions', '28 × 12 × 13 cm'], ['capacity', 'Bis zu 8']],
  );
  assert.deepEqual(
    rombergSpecifications('Romberg Heizmatte', '40 × 15 cm und 14 Watt', 'en').map((x) => [x.key, x.value]),
    [['dimensions', '40 × 15 cm'], ['power', '14 W']],
  );
  assert.deepEqual(rombergSpecifications('Romberg Anzucht-Erlebnisbox', 'Praktisches Set.'), []);
});
