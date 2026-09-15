'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const c = require('./controller.cjs');
const d = require('./delivery.cjs');
const proposal = (files = [{path: 'assets/test.css', content: 'body { color: inherit; }'}]) => JSON.stringify({summary: 'Theme adjustment', files});
for (const filename of ['assets/a.css', 'assets/a.js', 'blocks/test.liquid', 'layout/theme.liquid', 'sections/main-product.liquid', 'snippets/foo.liquid', 'templates/product.json', 'locales/de.default.json']) {
  test(`accepts theme file ${filename}`, () => assert.equal(c.allowedPath(filename), true));
}
for (const filename of ['.github/workflows/ci.yml', 'automation/codex/controller.cjs', 'supabase/a.sql', 'config/settings_data.json', '../assets/a.js', 'assets/../a.js', 'assets//a.js', '/assets/a.js', 'assets/.hidden.js', 'assets/a\\b.js', 'assets/a\n.js', 'assets/leaf-release.json', 'assets/asset.png']) {
  test(`rejects protected or malformed path ${JSON.stringify(filename)}`, () => assert.equal(c.allowedPath(filename), false));
}
test('accepts a well-formed small proposal', () => assert.equal(c.validateProposal(proposal()).files.length, 1));
test('rejects unexpected fields', () => assert.throws(() => c.validateProposal(JSON.stringify({summary: '', files: [], command: 'anything'}))));
test('rejects empty changes', () => assert.throws(() => c.validateProposal(proposal([]))));
test('rejects duplicate and case-colliding files', () => assert.throws(() => c.validateProposal(proposal([{path: 'assets/a.js', content: ''}, {path: 'assets/A.js', content: ''}]))));
test('rejects oversized changes', () => assert.throws(() => c.validateProposal(proposal([{path: 'assets/a.css', content: 'x'.repeat(64001)}]))));
test('rejects too many files', () => assert.throws(() => c.validateProposal(proposal(Array.from({length: 13}, (_, i) => ({path: `assets/a${i}.js`, content: ''}))))));
test('rejects malformed generated JSON files', () => assert.throws(() => c.validateProposal(proposal([{path: 'templates/a.json', content: '{bad json}'}]))));
test('accepts Shopify leading JSON comments without stripping string values', () => {
  assert.equal(c.validateProposal(proposal([{path: 'templates/a.json', content: '/* generated */\n{"url":"https://example.invalid/a/*b*/"}'}])).files.length, 1);
});
test('rejects credential-shaped output', () => {
  const fake = ['shpat', '_', 'A'.repeat(30)].join('');
  assert.throws(() => c.validateProposal(proposal([{path: 'assets/a.js', content: fake}])));
});
test('rejects binary text', () => assert.throws(() => c.validateProposal(proposal([{path: 'assets/a.js', content: '\0'}]))));
const issue = {number: 42, user: {login: 'davidnoehmke'}, title: '[LEAF CODE] Test', body: 'Preserve the slider.', state: 'open'};
test('accepts the authorized open request', () => assert.equal(c.validateIssue(issue).number, 42));
test('rejects a public stranger request', () => assert.throws(() => c.validateIssue({...issue, user: {login: 'untrusted-public-user'}})));
test('rejects closed requests and pull requests', () => { assert.throws(() => c.validateIssue({...issue, state: 'closed'})); assert.throws(() => c.validateIssue({...issue, pull_request: {}})); });
test('detects an edited request', () => assert.notEqual(c.issueDigest(issue), c.issueDigest({...issue, body: 'Changed instructions'})));
const protection = {enforce_admins: {enabled: true}, required_status_checks: {strict: true, contexts: [...c.REQUIRED, 'leaf/preview']}};
test('accepts mandatory strict CI and preview checks', () => assert.doesNotThrow(() => c.validateProtection(protection)));
test('rejects missing preview gate', () => assert.throws(() => c.validateProtection({...protection, required_status_checks: {strict: true, contexts: c.REQUIRED}})));
test('rejects administrator bypass', () => assert.throws(() => c.validateProtection({...protection, enforce_admins: {enabled: false}})));
test('does not bypass required human review', () => assert.throws(() => c.validateProtection({...protection, required_pull_request_reviews: {required_approving_review_count: 1}})));
test('rejects force push permission', () => assert.throws(() => c.validateProtection({...protection, allow_force_pushes: {enabled: true}})));
const env = {SHOPIFY_STORE: 'example.myshopify.com', SHOPIFY_STAGING_THEME_ID: '123', SHOPIFY_LIVE_THEME_ID: '456', SHOPIFY_CLI_THEME_TOKEN: 'test-only'};
test('accepts canonical store and distinct IDs', () => assert.equal(d.config(env).staging, 123));
test('rejects live as the staging destination', () => assert.throws(() => d.config({...env, SHOPIFY_STAGING_THEME_ID: '456'})));
test('rejects arbitrary credential destination hosts', () => assert.throws(() => d.config({...env, SHOPIFY_STORE: 'example.invalid'})));
test('verifies actual remote theme roles', () => assert.doesNotThrow(() => d.roles([{id: 123, role: 'unpublished'}, {id: 456, role: 'main'}], d.config(env))));
test('rejects swapped theme roles', () => assert.throws(() => d.roles([{id: 123, role: 'main'}, {id: 456, role: 'unpublished'}], d.config(env))));
test('a matching marker is insufficient when file content differs', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'leaf-test-'));
  try {
    fs.mkdirSync(path.join(dir, 'assets')); const marker = {run: 123, files_digest: 'test'};
    fs.writeFileSync(path.join(dir, 'assets/leaf-release.json'), JSON.stringify(marker));
    const p = {files: [{path: 'assets/test.css', content: 'correct'}]};
    assert.equal(d.matchesFiles(dir, p, marker), false);
    fs.writeFileSync(path.join(dir, 'assets/test.css'), 'incorrect'); assert.equal(d.matchesFiles(dir, p, marker), false);
    fs.writeFileSync(path.join(dir, 'assets/test.css'), 'correct'); assert.equal(d.matchesFiles(dir, p, marker), true);
    assert.equal(d.matchesFiles(dir, p, {...marker, run: 124}), false);
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});
test('rejects nonnumeric IDs and malformed hashes', () => { assert.throws(() => c.number('1; echo anything')); assert.throws(() => c.sha('main')); });
