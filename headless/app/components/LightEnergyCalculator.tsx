import {useState} from 'react';
import {estimateLightEnergy} from '~/lib/light-energy';

type Locale = 'de' | 'en';
const COPY = {
  de: {
    heading: 'Deine Angaben',
    watts: 'Leistung je Leuchte (W)',
    count: 'Anzahl der Leuchten',
    hours: 'Betriebsstunden pro Tag (h)',
    days: 'Berechnungszeitraum (Tage)',
    tariff: 'Dein Strompreis (€/kWh)',
    totalCost: 'Stromkosten im gewählten Zeitraum',
    totalEnergy: 'Verbrauch im gewählten Zeitraum',
    dailyEnergy: 'Verbrauch pro Tag',
    invalid: 'Bitte gib gültige Werte ein. Maximal 24 Stunden pro Tag und 366 Tage.',
    hint: 'Der eingegebene Strompreis ist ein frei änderbares Beispiel, kein aktueller Tarif. Keine Daten werden gespeichert oder versendet.',
  },
  en: {
    heading: 'Your inputs',
    watts: 'Power per light (W)',
    count: 'Number of lights',
    hours: 'Hours per day (h)',
    days: 'Calculation period (days)',
    tariff: 'Your electricity tariff (€/kWh)',
    totalCost: 'Electricity cost for the period',
    totalEnergy: 'Energy used during the period',
    dailyEnergy: 'Energy used per day',
    invalid: 'Enter valid values, up to 24 hours per day and 366 days.',
    hint: 'The electricity tariff is an editable example, not a current market price. No inputs are stored or transmitted.',
  },
} as const;

export function LightEnergyCalculator({locale = 'de'}: {locale?: Locale}) {
  const [wattsPerLight, setWatts] = useState(25);
  const [lightCount, setCount] = useState(1);
  const [hoursPerDay, setHours] = useState(12);
  const [days, setDays] = useState(30);
  const [tariffPerKwh, setTariff] = useState(0.35);
  const copy = COPY[locale];
  const result = estimateLightEnergy({wattsPerLight, lightCount, hoursPerDay, days, tariffPerKwh});
  const decimal = new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-GB', {maximumFractionDigits: 2});
  const money = new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-GB', {style: 'currency', currency: 'EUR'});

  return <section className="leaf-energy-tool" aria-labelledby="leaf-energy-title">
    <h2 id="leaf-energy-title">{copy.heading}</h2>
    <div className="leaf-energy-fields">
      <label>{copy.watts}<input type="number" inputMode="decimal" min="0" max="5000" step="any" value={Number.isFinite(wattsPerLight) ? wattsPerLight : ''} onChange={e => setWatts(e.currentTarget.valueAsNumber)}/></label>
      <label>{copy.count}<input type="number" inputMode="numeric" min="1" max="100" step="1" value={Number.isFinite(lightCount) ? lightCount : ''} onChange={e => setCount(e.currentTarget.valueAsNumber)}/></label>
      <label>{copy.hours}<input type="number" inputMode="decimal" min="0" max="24" step="any" value={Number.isFinite(hoursPerDay) ? hoursPerDay : ''} onChange={e => setHours(e.currentTarget.valueAsNumber)}/></label>
      <label>{copy.days}<input type="number" inputMode="numeric" min="1" max="366" step="1" value={Number.isFinite(days) ? days : ''} onChange={e => setDays(e.currentTarget.valueAsNumber)}/></label>
      <label>{copy.tariff}<input type="number" inputMode="decimal" min="0" max="10" step="any" value={Number.isFinite(tariffPerKwh) ? tariffPerKwh : ''} onChange={e => setTariff(e.currentTarget.valueAsNumber)}/></label>
    </div>
    <div className="leaf-energy-results" aria-live="polite" aria-atomic="true">
      {result ? <>
        <div><span>{copy.totalCost}</span><strong>{money.format(result.costInPeriod)}</strong></div>
        <div><span>{copy.totalEnergy}</span><strong>{decimal.format(result.kwhInPeriod)} kWh</strong></div>
        <div><span>{copy.dailyEnergy}</span><strong>{decimal.format(result.kwhPerDay)} kWh</strong></div>
      </> : <p role="status">{copy.invalid}</p>}
    </div>
    <p className="leaf-energy-note">{copy.hint}</p>
  </section>;
}
