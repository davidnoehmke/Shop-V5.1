import test from 'node:test';
import assert from 'node:assert/strict';
import {equalShares, rebalance, parseVoiceShareCommand} from '../app/lib/substrate-mix.ts';

const items = ['Perlite', 'Lava', 'Bims', 'Pinienrinde', 'Blaehton']
  .map((title, i) => ({id: `component-${i}`, title, handle: title.toLowerCase()}));

function assertValid(parts) {
  assert.equal(parts.reduce((sum, part) => sum + part.share, 0), 100);
  for (const part of parts) {
    assert.ok(Number.isInteger(part.share) && part.share >= 0 && part.share <= 100, `${part.title}: ${part.share}`);
  }
}

test('equal selection allocates exactly 100 integer percent across 1..5 parts', () => {
  for (let n = 1; n <= 5; n++) assertValid(equalShares(items.slice(0, n)));
  assert.deepEqual(equalShares([]), []);
});

test('previous rounding failure cannot produce negative layers in five-component visual', () => {
  const result = rebalance(equalShares(items), 0, 98);
  assertValid(result);
  assert.equal(result[0].share, 98);
});

test('slider and voice updates preserve 100 percent for all targets and repeated edits', () => {
  for (let n = 1; n <= 5; n++) {
    let mix = equalShares(items.slice(0, n));
    for (let turn = 0; turn < 4; turn++) {
      for (let value = 0; value <= 100; value++) {
        const index = (turn * 7 + value) % n;
        mix = rebalance(mix, index, value);
        assertValid(mix);
        assert.equal(mix[index].share, n === 1 ? 100 : value);
      }
    }
  }
});

test('out-of-range and non-finite changes are safely handled', () => {
  const current = equalShares(items.slice(0, 2));
  assert.equal(rebalance(current, 0, Number.NaN), current);
  assert.equal(rebalance(current, 99, 40), current);
  assertValid(rebalance(current, 1, -50));
  assertValid(rebalance(current, 1, 500));
});

test('speech parser validates integer amounts, language, ambiguity and single-part recipes', () => {
  const mix = equalShares(items.slice(0, 2));
  assert.deepEqual(parseVoiceShareCommand('Setze Perlite auf 25 Prozent', mix, 'de'),
    {kind: 'valid', partId: mix[0].id, requested: 25});
  assert.deepEqual(parseVoiceShareCommand('Set Lava to 0 percent', mix, 'en'),
    {kind: 'valid', partId: mix[1].id, requested: 0});
  for (const amount of ['-5', '101', '1000', '25,5', '25.5']) {
    assert.deepEqual(parseVoiceShareCommand(`Setze Perlite auf ${amount} Prozent`, mix, 'de'), {kind: 'invalid'});
  }
  assert.deepEqual(parseVoiceShareCommand('Setze auf 40 Prozent', mix, 'de'), {kind: 'ambiguous'});
  assert.deepEqual(parseVoiceShareCommand('Setze Perlite und Lava auf 40 Prozent', mix, 'de'), {kind: 'ambiguous'});
  assert.deepEqual(parseVoiceShareCommand('Es ist ein schoener Tag', mix, 'de'), {kind: 'none'});
  assert.deepEqual(parseVoiceShareCommand('Perlite auf 30 Prozent', equalShares(items.slice(0, 1)), 'de'), {kind: 'single'});
});
