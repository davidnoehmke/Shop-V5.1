import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {test} from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const palette = read('app/styles/palette.css');
const expected = {
  cream: '#F5F0E6', sand: '#DDD1BE', sage: '#A3AD95',
  eucalyptus: '#788C7B', olive: '#454D3D', taupe: '#A89B8B',
};
function files(dir) {
  return readdirSync(path.join(root, dir), {withFileTypes:true}).flatMap(
    (entry) => entry.isDirectory()
      ? files(path.join(dir, entry.name))
      : [path.join(dir, entry.name)],
  );
}
function rgb(hex) {
  return hex.slice(1).match(/../g).map((value) => parseInt(value, 16));
}
function luminance(channels) {
  return channels.map((v) => v / 255).map(
    (v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  ).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test('the six approved colors are exact and defined only in the palette', () => {
  const entries = [...palette.matchAll(/--leaf-([a-z]+):\s*(#[0-9A-F]{6});/g)];
  assert.deepEqual(Object.fromEntries(entries.map((m) => [m[1], m[2]])), expected);
  assert.equal((palette.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length, 6);
  for (const file of files('app').filter((name) => name.endsWith('.css'))) {
    if (file.endsWith('palette.css')) continue;
    const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\(/i, file);
    assert.doesNotMatch(css, /(?:^|[;{])\s*(?:color|background(?:-color)?|border(?:-color)?|fill|stroke)\s*:[^;{}]*\b(?:white|black|red|blue|green|gray|grey)\b/im, file);
  }
});

test('palette is loaded globally before reset and app CSS for both locales', () => {
  const source = read('app/root.tsx');
  const paletteLink = source.indexOf('href={paletteStyles}');
  assert.ok(paletteLink >= 0);
  assert.ok(paletteLink < source.indexOf('href={resetStyles}'));
  assert.ok(paletteLink < source.indexOf('href={appStyles}'));
  assert.match(palette, /color-scheme:\s*light/);
  assert.match(palette, /accent-color:\s*var\(--leaf-olive\)/);
});

test('normal text combinations and derived light surfaces meet 4.5:1', () => {
  const olive = rgb(expected.olive);
  const cream = rgb(expected.cream);
  assert.ok(contrast(olive, cream) >= 7);
  assert.ok(contrast(olive, rgb(expected.sand)) >= 4.5);
  for (const match of palette.matchAll(/--leaf-surface-[a-z]+:\s*color-mix\(in srgb, var\(--leaf-cream\) (\d+)%, var\(--leaf-([a-z]+)\)\)/g)) {
    const weight = Number(match[1]) / 100;
    const accent = rgb(expected[match[2]]);
    const surface = cream.map((v, i) => v * weight + accent[i] * (1 - weight));
    assert.ok(contrast(olive, surface) >= 4.5, match[0]);
  }
  assert.ok(contrast(rgb(expected.eucalyptus), cream) >= 3, 'control borders');
});

test('every leaf token reference resolves to a centrally declared token', () => {
  const defined = new Set([...palette.matchAll(/(--leaf-[a-z-]+):/g)].map((m) => m[1]));
  for (const file of files('app').filter((name) => name.endsWith('.css'))) {
    for (const match of read(file).matchAll(/var\((--leaf-[a-z-]+)/g)) {
      if (['--leaf-section-blend', '--leaf-assistant-x', '--leaf-assistant-y'].includes(match[1])) continue; // Local spacing/position, not colors.
      assert.ok(defined.has(match[1]), file + ': ' + match[1]);
    }
  }
});

test('section blend endpoints stay aligned with the canonical palette', () => {
  const css = read('app/styles/app.css');
  assert.match(css, /var\(--leaf-surface-sage\) 0,\s*var\(--leaf-ink\) var\(--leaf-section-blend\)/);
  assert.match(css, /var\(--leaf-ink\) calc\(100% - var\(--leaf-section-blend\)\),\s*var\(--leaf-surface-sage\) 100%/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
