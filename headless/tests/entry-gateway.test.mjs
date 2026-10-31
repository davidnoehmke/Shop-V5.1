import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {ENTRY_COPY, ENTRY_INTENTS} from '../app/lib/entry-gateway.ts';

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const component = read('app/components/LeafEntryGateway.tsx');
const css = read('app/styles/entry-gateway.css');

test('both locales expose the same six unique entry intents', () => {
  assert.equal(ENTRY_INTENTS.de.length, 6);
  assert.deepEqual(ENTRY_INTENTS.de.map((item) => item.id), ENTRY_INTENTS.en.map((item) => item.id));
  assert.equal(new Set(ENTRY_INTENTS.de.map((item) => item.id)).size, 6);
});
test('all entry destinations are local and retain the visitor locale', () => {
  for (const locale of ['de', 'en']) {
    for (const intent of ENTRY_INTENTS[locale]) {
      for (const href of [intent.href, intent.alternative.href]) {
        assert.ok(href.startsWith('/') && !href.startsWith('//'));
        assert.equal(new URL(href, 'https://leaferservice.com').origin, 'https://leaferservice.com');
        assert.equal(href.startsWith('/en/'), locale === 'en');
      }
    }
  }
});
test('entry paths and detailed advice are real server-rendered links, not a mandatory quiz', () => {
  assert.match(component, /<details/);
  assert.match(component, /<summary>/);
  assert.match(component, /to=\{intent.href\}/);
  assert.match(component, /id="leaf-anliegen"/);
  assert.match(component, /href="#leaf-anliegen"/);
  assert.match(component, /\/collections\/all/);
  assert.match(component, /\/blogs/);
});
test('new entry UI does not collect identifiers, set cookies or invent unavailable services', () => {
  assert.doesNotMatch(component, /localStorage|sessionStorage|document\.cookie|fetch\(|sendBeacon|type="email"/);
  const copy = JSON.stringify(ENTRY_COPY);
  assert.doesNotMatch(copy, /Fotoanalyse starten|Diagnose starten|automatisch nachbestellen|PDF herunterladen/);
  assert.doesNotMatch(component, /dangerouslySetInnerHTML/);
});
test('every entry and FAQ has nonempty localized copy', () => {
  for (const locale of ['de', 'en']) {
    for (const intent of ENTRY_INTENTS[locale]) {
      for (const key of ['title', 'world', 'description', 'action']) assert.ok(intent[key].length > 2);
    }
    assert.equal(ENTRY_COPY[locale].faqs.length, 3);
    assert.ok(ENTRY_COPY[locale].faqs.every((faq) => faq.question.length > 5 && faq.answer.length > 15));
  }
});
test('new styling stays token-based, responsive and reduced-motion aware', () => {
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|oklab)\(/);
  const tokens = new Set(['--leaf-cream', '--leaf-sand', '--leaf-sage', '--leaf-eucalyptus', '--leaf-olive', '--leaf-taupe']);
  for (const match of css.matchAll(/var\((--leaf-[a-z-]+)/g)) assert.ok(tokens.has(match[1]));
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /focus-visible/);
  assert.match(css, /max-width: 680px/);
  assert.match(css, /min-height: 48px/);
});
test('home queries preserve commerce with server-only data loading in both routes', () => {
  const de = read('app/routes/_index.tsx');
  const en = read('app/routes/en._index.tsx');
  const server = read('app/lib/entry-home.server.ts');
  assert.match(server, /collection\(handle: "substratwelt-pflanzsubstrate-mischungen-zusatze"\)/);
  assert.match(server, /query EntryJournal/);
  assert.match(server, /Promise\.all/);
  assert.match(server, /journal preview unavailable/);
  for (const route of [de, en]) {
    assert.match(route, /export async function loader/);
    assert.match(route, /return loadEntryHomepage\(context\)/);
    assert.match(route, /entry-home\.server/);
    assert.doesNotMatch(route, /from ['"]\.\/_index['"]/);
  }
  assert.match(de, /locale="de"/);
  assert.match(en, /locale="en"/);
});
