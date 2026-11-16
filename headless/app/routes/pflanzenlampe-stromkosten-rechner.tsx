import {Link} from 'react-router';
import type {Route} from './+types/pflanzenlampe-stromkosten-rechner';
import {LightEnergyCalculator} from '~/components/LightEnergyCalculator';
import energyStyles from '~/styles/light-energy.css?url';

export const links: Route.LinksFunction = () => [
  {rel: 'stylesheet', href: energyStyles},
  {rel: 'canonical', href: 'https://leaferservice.com/pflanzenlampe-stromkosten-rechner'},
];
export const meta: Route.MetaFunction = () => [
  {title: 'Pflanzenlampe Stromkosten berechnen | Kostenloser Rechner | LEAFerservice'},
  {name: 'description', content: 'Was kostet eine LED-Pflanzenlampe pro Tag oder Monat? Berechne Watt, Betriebsstunden, Stromverbrauch (kWh) und Kosten mit deinem Strompreis.'},
];
export default function GrowLightCostPage() {
  return <main className="leaf-energy-page">
    <header>
      <p className="page-eyebrow">Pflanzenlicht · Kostenloser Rechner</p>
      <h1>Was kostet deine Pflanzenlampe an Strom?</h1>
      <p className="page-lead">Ermittle Stromverbrauch und Energiekosten deiner LED-Pflanzenbeleuchtung. Trage die Leistungsaufnahme, Beleuchtungsdauer und deinen eigenen Stromtarif ein.</p>
    </header>
    <LightEnergyCalculator locale="de"/>
    <article className="leaf-energy-explainer">
      <h2>So werden die Stromkosten berechnet</h2>
      <p>Stromverbrauch (kWh) = Leistung (W) × Leuchtenzahl × Betriebsstunden ÷ 1.000. Für einen Zeitraum multiplizieren wir den Tagesverbrauch mit der Anzahl der Tage. Die Kosten entstehen durch die Multiplikation mit deinem Strompreis in Euro pro kWh.</p>
      <h2>Beispiel: 25-Watt-LED für 12 Stunden täglich</h2>
      <p>Bei einer 25-Watt-Pflanzenleuchte, 12 Stunden täglich und 30 Tagen ergeben sich 9 kWh. Bei einem <strong>angenommenen</strong> Strompreis von 0,35 €/kWh sind das 3,15 € für diesen Zeitraum. Der tatsächliche Strompreis und die Leistungsaufnahme deines Geräts können abweichen.</p>
      <h2>Stromkosten sagen nichts über die Lichtmenge am Blatt aus</h2>
      <p>Watt misst elektrische Leistung, nicht die nutzbare Beleuchtungsstärke für Pflanzen. Für die Pflanzeneignung sind unter anderem PPF, PPFD, Abstand, Abstrahlwinkel und Tageslicht relevant. <Link to="/pflanzenlicht-vergleich">Vergleiche hier Pflanzenleuchten anhand vorhandener Herstellerangaben.</Link></p>
      <p>Dieser Rechner ist eine Orientierung für den Energieverbrauch und keine Zusage zu Lichtwirkung, Lebensdauer oder tatsächlichen Stromkosten.</p>
    </article>
  </main>;
}
