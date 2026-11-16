import {Link} from 'react-router';
import type {Route} from './+types/en.grow-light-electricity-cost-calculator';
import {LightEnergyCalculator} from '~/components/LightEnergyCalculator';
import energyStyles from '~/styles/light-energy.css?url';

export const links: Route.LinksFunction = () => [
  {rel: 'stylesheet', href: energyStyles},
  {rel: 'canonical', href: 'https://leaferservice.com/en/grow-light-electricity-cost-calculator'},
];
export const meta: Route.MetaFunction = () => [
  {title: 'Grow Light Electricity Cost Calculator | LEAFerservice'},
  {name: 'description', content: 'Estimate grow-light electricity costs: enter watts, number of lights, daily hours, days and your electricity price in EUR per kWh.'},
];
export default function GrowLightCostPageEnglish() {
  return <main className="leaf-energy-page">
    <header>
      <p className="page-eyebrow">Grow lights · Free calculator</p>
      <h1>How much electricity does a grow light use?</h1>
      <p className="page-lead">Calculate energy consumption and electricity costs from the actual power rating, daily operating hours and your electricity tariff.</p>
    </header>
    <LightEnergyCalculator locale="en"/>
    <article className="leaf-energy-explainer">
      <h2>How the estimate works</h2>
      <p>Energy per day (kWh) = watts per light × number of lights × hours per day ÷ 1,000. Multiply by the number of days and the electricity price per kWh to estimate cost.</p>
      <h2>Example: a 25 W LED running 12 hours per day</h2>
      <p>Over 30 days the light uses 9 kWh. At an <strong>illustrative</strong> tariff of €0.35 per kWh, that costs €3.15. Enter your actual tariff for a more relevant estimate.</p>
      <h2>Wattage does not measure plant-light suitability</h2>
      <p>Power consumption alone does not tell you the light delivered to plant leaves. Consider verified PPF, PPFD, distance and daylight. <Link to="/en/pflanzenlicht-vergleich">Explore the grow-light comparison.</Link></p>
      <p>This calculator is an estimate, not a guarantee of light output, energy bills or plant growth.</p>
    </article>
  </main>;
}
