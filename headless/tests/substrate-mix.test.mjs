import assert from 'node:assert/strict';
import {test} from 'node:test';
import {equalShares, rebalance} from '../app/lib/substrate-mix.ts';

const parts = ['a', 'b', 'c', 'd'].map((id) => ({id, handle: id, title: id}));
function valid(mix) {
  assert.equal(mix.reduce((sum, part) => sum + part.share, 0), 100);
  assert.ok(mix.every((part) => Number.isInteger(part.share) && part.share >= 0 && part.share <= 100));
}

test('a 98 to 99 percent adjustment never produces a negative remainder', () => {
  const initial = equalShares(parts);
  const next = rebalance(rebalance(initial, 0, 98), 0, 99);
  valid(next);
  assert.equal(next[0].share, 99);
});

test('one to four components remain balanced through all slider positions', () => {
  for (let count = 1; count <= 4; count++) {
    let mix = equalShares(parts.slice(0, count));
    for (let index = 0; index < count; index++) {
      for (let value = 0; value <= 100; value++) {
        mix = rebalance(mix, index, value);
        valid(mix);
        assert.equal(mix[index].share, count === 1 ? 100 : value);
      }
    }
  }
});
