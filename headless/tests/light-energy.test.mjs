import assert from 'node:assert/strict';
import {test} from 'node:test';
import {estimateLightEnergy} from '../app/lib/light-energy.ts';
const base = {wattsPerLight: 25, lightCount: 1, hoursPerDay: 12, days: 30, tariffPerKwh: 0.35};

test('25 W for 12 h over 30 days uses 9 kWh and costs 3.15 currency units', () => {
  const result = estimateLightEnergy(base);
  assert.ok(result);
  assert.ok(Math.abs(result.kwhPerDay - 0.3) < 1e-9);
  assert.ok(Math.abs(result.kwhInPeriod - 9) < 1e-9);
  assert.ok(Math.abs(result.costInPeriod - 3.15) < 1e-9);
});
test('two lights scale consumption and cost linearly', () => {
  const single = estimateLightEnergy(base);
  const double = estimateLightEnergy({...base, lightCount: 2});
  assert.equal(double.kwhInPeriod, single.kwhInPeriod * 2);
  assert.equal(double.costInPeriod, single.costInPeriod * 2);
});
test('zero hours, zero power and zero tariff are valid', () => {
  assert.equal(estimateLightEnergy({...base, hoursPerDay: 0}).costInPeriod, 0);
  assert.equal(estimateLightEnergy({...base, wattsPerLight: 0}).kwhInPeriod, 0);
  assert.equal(estimateLightEnergy({...base, tariffPerKwh: 0}).costInPeriod, 0);
});
test('rejects invalid, fractional count and non-finite values', () => {
  for (const candidate of [
    {...base, wattsPerLight: -1}, {...base, wattsPerLight: Infinity},
    {...base, lightCount: 0}, {...base, lightCount: 1.5},
    {...base, hoursPerDay: 24.01}, {...base, days: 0},
    {...base, days: 367}, {...base, tariffPerKwh: -0.01},
    {...base, tariffPerKwh: Number.NaN},
  ]) assert.equal(estimateLightEnergy(candidate), null);
});
