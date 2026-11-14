const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
function files(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const name = path.join(dir, entry.name);
    return entry.isDirectory() ? files(name) : name.endsWith('.liquid') ? [name] : [];
  });
}
function locale(name) {
  return JSON.parse(fs.readFileSync(path.join(root, 'locales', name), 'utf8').replace(/^\s*\/\*[\s\S]*?\*\//, ''));
}

test('literal storefront translations resolve in both published source locales', () => {
  const sources = ['layout', 'sections', 'snippets', 'templates', 'blocks'].flatMap((dir) => files(path.join(root, dir)));
  const errors = [];
  for (const filename of ['de.default.json', 'en.json']) {
    const translations = locale(filename);
    for (const source of sources) {
      const text = fs.readFileSync(source, 'utf8');
      const schema = text.match(/{% schema %}([\s\S]*?){% endschema %}/);
      const local = schema ? JSON.parse(schema[1]).locales?.[filename.startsWith('de.') ? 'de' : 'en'] : null;
      for (const match of text.matchAll(/['"]([\w-]+(?:\.[\w-]+)+)['"]\s*\|\s*t\b/g)) {
        const sectionPrefix = `sections.${path.basename(source, '.liquid')}.`;
        const scoped = local && match[1].startsWith(sectionPrefix)
          ? match[1].slice(sectionPrefix.length).split('.').reduce((item, key) => item?.[key], local)
          : undefined;
        const value = scoped ?? match[1].split('.').reduce((item, key) => item?.[key], translations);
        if (typeof value !== 'string' || !value.trim()) errors.push(`${filename}: ${match[1]} (${path.relative(root, source)})`);
      }
    }
  }
  assert.deepEqual(errors, []);
});

test('literal render calls include their snippet in the theme source', () => {
  const errors = [];
  for (const source of ['layout', 'sections', 'snippets', 'templates', 'blocks'].flatMap((dir) => files(path.join(root, dir)))) {
    for (const match of fs.readFileSync(source, 'utf8').matchAll(/\brender\s+['"]([^'"]+)['"]/g)) {
      if (!fs.existsSync(path.join(root, 'snippets', `${match[1]}.liquid`))) errors.push(`${path.relative(root, source)}: ${match[1]}`);
    }
  }
  assert.deepEqual(errors, []);
});

test('translated content never treats image markup or merchant headings as translation keys', () => {
  const errors = [];
  for (const source of ['layout', 'sections', 'snippets', 'templates', 'blocks'].flatMap((dir) => files(path.join(root, dir)))) {
    const text = fs.readFileSync(source, 'utf8');
    for (const output of text.matchAll(/{{([\s\S]*?)}}/g)) {
      if (/\bimage_tag\s*:/.test(output[1]) && /\|\s*t\b/.test(output[1])) errors.push(`${source}: image markup sent to translation`);
      if (/variant_content\./.test(output[1]) && /\|\s*t\b/.test(output[1])) errors.push(`${source}: merchant heading sent to translation`);
    }
  }
  assert.deepEqual(errors, []);
});

test('all section setting identifiers are unique within their scope', () => {
  for (const source of files(path.join(root, 'sections'))) {
    const schema = fs.readFileSync(source, 'utf8').match(/{% schema %}([\s\S]*?){% endschema %}/);
    if (!schema) continue;
    const data = JSON.parse(schema[1]);
    for (const scope of [data, ...(data.blocks || [])]) {
      const ids = (scope.settings || []).map(item => item.id).filter(Boolean);
      assert.equal(new Set(ids).size, ids.length, path.relative(root, source));
    }
  }
});

test('retained product templates have their legacy translation keys in DE and EN', () => {
  for (const name of ['de.default.json', 'en.json']) {
    const data = locale(name);
    for (const key of ['details_eyebrow', 'details_heading', 'guides']) assert.ok(data.product.content[key]?.trim());
    assert.ok(data.recipe.chart_label.includes('{{ product }}'));
  }
});
