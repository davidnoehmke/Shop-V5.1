'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const section = fs.readFileSync(path.join(root, 'sections/venso-brand-landing.liquid'), 'utf8');
const template = JSON.parse(fs.readFileSync(path.join(root, 'templates/collection.venso.json'), 'utf8'));
const schema = JSON.parse(section.match(/{% schema %}([\s\S]*?){% endschema %}/)[1]);

test('VENSO collection is isolated from all other collection templates', () => {
  assert.equal(template.sections.venso.type, 'venso-brand-landing');
  assert.deepEqual(template.order, ['breadcrumbs', 'venso']);
  assert.match(section, /collection\.handle == 'venso'/);
  assert.match(section, /product\.vendor contains 'Venso'/);
});

test('VENSO landing shows real Shopify product media, prices and product URLs', () => {
  assert.match(section, /product\.featured_image \| image_url:/);
  assert.match(section, /product\.price \| money/);
  assert.match(section, /href="{{ product\.url }}"/);
  assert.match(section, /paginate collection\.products by 24/);
  assert.doesNotMatch(section, /product\.status\s*==\s*'DRAFT'/);
});

test('VENSO landing has two languages and matching section-local translations', () => {
  const referenced = [...section.matchAll(/sections\.venso-brand-landing\.([a-z0-9_]+)/g)].map(match => match[1]);
  assert.ok(referenced.length >= 35);
  for (const key of referenced) {
    assert.equal(typeof schema.locales.de[key], 'string', 'Missing German key ' + key);
    assert.equal(typeof schema.locales.en[key], 'string', 'Missing English key ' + key);
  }
});

test('VENSO landing includes a navigable, accessible and compact mobile experience', () => {
  assert.match(section, /aria-labelledby/);
  assert.match(section, /:focus-visible/);
  assert.match(section, /@media\(max-width:700px\)/);
  assert.match(section, /prefers-reduced-motion:reduce/);
});
