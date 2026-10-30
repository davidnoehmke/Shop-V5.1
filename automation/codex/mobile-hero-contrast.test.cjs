const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const asset = fs.readFileSync('assets/leaf-home-refresh.css', 'utf8');
const hero = fs.readFileSync('sections/hero.liquid', 'utf8');
const parseLocale = (file) => JSON.parse(
  fs.readFileSync(file, 'utf8').replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '')
);

function luminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((part) => {
    const v = parseInt(part, 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a, b) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test('homepage brand lockup has no second, floating trademark', () => {
  assert.doesNotMatch(hero, /<sup class="hero__brand-tm"/);
  assert.doesNotMatch(hero, /hero__brand-tm\s*\{/);
});

test('homepage eyebrow is one readable statement in German and English', () => {
  const de = parseLocale('locales/de.default.json');
  const en = parseLocale('locales/en.json');
  assert.equal(de.home.solution.eyebrow, 'Substrat nach Maß');
  assert.equal(en.home.solution.eyebrow, 'Custom substrate');
  assert.ok(de.home.solution.text.length < 150, 'hero body copy should remain concise on mobile');
  assert.ok(en.home.solution.text.length < 150, 'English hero body copy should remain concise');
});

test('mobile hero headline, body and eyebrow contrast against light background', () => {
  const mobile = asset.match(/@media \(max-width: 700px\) \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(mobile, 'mobile-first hero overrides must exist');
  assert.match(mobile, /\.template-index \.hero \{[^}]*background: #e8e2d5; color: #17372a/);
  assert.match(mobile, /\.template-index \.hero h1 \{[^}]*color: #163727/);
  assert.match(mobile, /\.template-index \.hero__eyebrow \{[^}]*color: #24583c/);
  assert.match(mobile, /\.template-index \.hero__text, \.template-index \.hero__text p, \.template-index \.hero__content > p \{[^}]*color: #283d31/);
  for (const foreground of ['#163727', '#24583c', '#283d31']) {
    assert.ok(contrast(foreground, '#e8e2d5') >= 4.5, `text color ${foreground} must meet WCAG AA normal text contrast`);
  }
  assert.ok(contrast('#ffffff', '#20563a') >= 4.5, 'primary CTA must meet WCAG AA');
});
