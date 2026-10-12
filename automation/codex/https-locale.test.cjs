'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('theme uses native localized DE/EN forms with an explicit language override', () => {
  const theme = read('layout/theme.liquid');
  const header = read('sections/header.liquid');
  const selector = read('snippets/leaf-language-selector.liquid');
  const switcher = read('assets/leaf-language-switch.js');

  assert.match(theme, /<html lang="\{\{ request\.locale\.iso_code \}\}">/);
  assert.match(theme, /leaf-language-switch\.js/);
  assert.match(header, /leaf-language-selector/);
  assert.match(selector, /form 'localization'/);
  assert.match(selector, /name="language_code"/);
  assert.match(selector, /leaf_language\.iso_code == 'de' or leaf_language\.iso_code == 'en'/);
  assert.match(switcher, /manualKey/);
  assert.match(switcher, /window\.location\.pathname !== '\/'/);
  assert.match(switcher, /form\.requestSubmit\(\)/);
  for (const locale of ['de.default', 'en']) {
    const data = JSON.parse(read('locales/' + locale + '.json'));
    assert.ok(data.header.language && data.header.apply_language);
  }
});

test('Shopify theme does not embed assets over insecure HTTP', () => {
  const roots = ['assets', 'blocks', 'layout', 'sections', 'snippets'];
  const unsafeAttribute = /\b(?:src|href|action|poster|data-src)\s*=\s*(['"])http:\/\/[^'"]*\1/gi;
  const unsafeStyle = /url\(\s*['"]?http:\/\//gi;
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.(liquid|css|js)$/.test(entry.name)) continue;
      const source = fs.readFileSync(full, 'utf8');
      assert.doesNotMatch(source, unsafeAttribute, 'insecure HTML resource in ' + full);
      assert.doesNotMatch(source, unsafeStyle, 'insecure stylesheet resource in ' + full);
    }
  }
  roots.forEach((dir) => walk(path.join(root, dir)));
});
