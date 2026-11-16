import assert from 'node:assert/strict';
import {test} from 'node:test';
import {estimateLightEnergy} from '../app/lib/light-energy.ts';

const base = {wattsPerLight: 25, lightCount: 1, hoursPerDay: 12, days: 30, priceEurPerKwh: 0.35};

test('25 W for 12 hours over 30 days costs EUR 3.15 at 0.35 EUR/kWh', () => {
  const result = estimateLightEnergy(base);
  assert.ok(result);
  assert.ok(Math.abs(result.kwhPerDay - 0.3) < 1e-9);
  assert.ok(Math.abs(result.kwhInPeriod - 9) < 1e-9);
  assert.ok(Math.abs(result.costEurInPeriod - 3.15) < 1e-9);
});
test('two lights scale consumption and cost linearly', () => {
  const single = estimateLightEnergy(base);
  const double = estimateLightEnergy({...base, lightCount: 2});
  assert.equal(double.kwhInPeriod, single.kwhInPeriod * 2);
  assert.equal(double.costEurInPeriod, single.costEurInPeriod * 2);
});
test('zero-hours, zero-power and zero-tariff are valid', () => {
  assert.equal(estimateLightEnergy({...base, hoursPerDay: 0}).costEurInPeriod, 0);
  assert.equal(estimateLightEnergy({...base, wattsPerLight: 0}).kwhInPeriod, 0);
  assert.equal(estimateLightEnergy({...base, priceEurPerKwh: 0}).costEurInPeriod, 0);
});
test('rejects out-of-range, missing and non-finite values', () => {
  for (const candidate of [
    {...base, wattsPerLight: -1},
    {...base, lightCount: 0},
    {...base, lightCount: 1.5},
    {...base, hoursPerDay: 24.01},
    {...base, days: 0},
    {...base, days: 367},
    {...base, priceEurPerKwh: -0.01},
    {...base, priceEurPerKwh: Number.NaN},
    {...base, wattsPerLight: Infinity},
  ]) assert.equal(estimateLightEnergy(candidate), null);
});
