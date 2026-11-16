/** Pure, reusable grow-light electricity estimator. No network or product data. */
export type LightEnergyInput = {
  wattsPerLight: number;
  lightCount: number;
  hoursPerDay: number;
  days: number;
  priceEurPerKwh: number;
};

export type LightEnergyResult = {
  kwhPerDay: number;
  kwhInPeriod: number;
  costEurInPeriod: number;
};

/** Returns null for invalid input. Watts alone do not establish PPFD or plant suitability. */
export function estimateLightEnergy(input: LightEnergyInput): LightEnergyResult | null {
  const {wattsPerLight, lightCount, hoursPerDay, days, priceEurPerKwh} = input;
  if (
    ![wattsPerLight, lightCount, hoursPerDay, days, priceEurPerKwh].every(Number.isFinite) ||
    wattsPerLight < 0 || wattsPerLight > 5000 ||
    !Number.isInteger(lightCount) || lightCount < 1 || lightCount > 100 ||
    hoursPerDay < 0 || hoursPerDay > 24 ||
    !Number.isInteger(days) || days < 1 || days > 366 ||
    priceEurPerKwh < 0 || priceEurPerKwh > 10
  ) {
    return null;
  }
  const kwhPerDay = (wattsPerLight * lightCount * hoursPerDay) / 1000;
  const kwhInPeriod = kwhPerDay * days;
  return {kwhPerDay, kwhInPeriod, costEurInPeriod: kwhInPeriod * priceEurPerKwh};
}
