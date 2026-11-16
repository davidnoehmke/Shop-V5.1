/** Pure, reusable grow-light energy estimator. No network, catalog or currency dependency. */
export type LightEnergyInput = {
  wattsPerLight: number;
  lightCount: number;
  hoursPerDay: number;
  days: number;
  tariffPerKwh: number;
};
export type LightEnergyResult = {
  kwhPerDay: number;
  kwhInPeriod: number;
  costInPeriod: number;
};
/** Rejects invalid inputs; watts never imply PPFD or plant suitability. */
export function estimateLightEnergy(input: LightEnergyInput): LightEnergyResult | null {
  const {wattsPerLight, lightCount, hoursPerDay, days, tariffPerKwh} = input;
  if (
    ![wattsPerLight, lightCount, hoursPerDay, days, tariffPerKwh].every(Number.isFinite) ||
    wattsPerLight < 0 || wattsPerLight > 5000 ||
    !Number.isInteger(lightCount) || lightCount < 1 || lightCount > 100 ||
    hoursPerDay < 0 || hoursPerDay > 24 ||
    !Number.isInteger(days) || days < 1 || days > 366 ||
    tariffPerKwh < 0 || tariffPerKwh > 10
  ) return null;
  const kwhPerDay = (wattsPerLight * lightCount * hoursPerDay) / 1000;
  const kwhInPeriod = kwhPerDay * days;
  return {kwhPerDay, kwhInPeriod, costInPeriod: kwhInPeriod * tariffPerKwh};
}
