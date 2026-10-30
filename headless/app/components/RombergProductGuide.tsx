import {Link} from 'react-router';
import {RombergProductCard, type RombergProduct} from '~/components/RombergWorld';

type Locale = 'de' | 'en';

type Advice = {title: string; text: string};

function adviceFor(title: string, productType: string, english: boolean): Advice[] {
  if (/heizmatte/i.test(title)) {
    return english ? [
      {title: 'Check germination temperature', text: 'Warmth is useful when the plant species needs it. Monitor actual medium temperature rather than relying on room temperature alone.'},
      {title: 'Keep moisture in balance', text: 'Check moisture regularly. Extra warmth can increase evaporation, while very wet medium may promote problems.'},
      {title: 'Provide enough light', text: 'Warmth does not replace growing light. After germination, sufficient light is essential for healthy seedlings.'},
    ] : [
      {title: 'Keimtemperatur kontrollieren', text: 'Wärme hilft nur, wenn die Pflanzenart sie benötigt. Entscheidend ist die tatsächliche Temperatur im Anzuchtmedium.'},
      {title: 'Feuchtigkeit ausbalancieren', text: 'Bei zusätzlicher Wärme kann das Medium schneller austrocknen. Staunässe trotzdem vermeiden und regelmäßig prüfen.'},
      {title: 'Licht nicht vergessen', text: 'Wärme ersetzt kein Pflanzenlicht. Gerade nach dem Keimen benötigen Sämlinge ausreichend Helligkeit.'},
    ];
  }
  if (/quelltabletten|kokos/i.test(title) || productType === 'Anzuchtsubstrat') {
    return english ? [
      {title: 'Hydrate gently', text: 'Allow the coir plugs to expand fully with water before sowing.'},
      {title: 'Avoid waterlogging', text: 'Keep the medium evenly moist, not permanently saturated.'},
      {title: 'Transplant when ready', text: 'Once roots and growth are established, move seedlings into a suitable pot and growing mix.'},
    ] : [
      {title: 'Schonend aufquellen lassen', text: 'Quelltabletten vor dem Aussäen mit Wasser vollständig aufquellen lassen.'},
      {title: 'Staunässe vermeiden', text: 'Das Medium gleichmäßig feucht, aber nicht dauerhaft nass halten.'},
      {title: 'Rechtzeitig umsetzen', text: 'Jungpflanzen bei ausreichender Wurzelbildung in Topf und passendes Substrat weiterkultivieren.'},
    ];
  }
  return english ? [
    {title: 'Keep the climate balanced', text: 'A covered propagator can retain humidity. Ventilate regularly and check condensation.'},
    {title: 'Match light to growth', text: 'Choose a bright, species-appropriate position and protect young seedlings from unsuitable extremes.'},
    {title: 'Move on at the right time', text: 'Gradually acclimatise seedlings and transplant once roots are ready.'},
  ] : [
    {title: 'Mikroklima ausbalancieren', text: 'Eine Haube kann Feuchtigkeit halten. Regelmäßig lüften und Kondenswasser kontrollieren.'},
    {title: 'Licht passend wählen', text: 'Jungpflanzen benötigen einen hellen, zur Pflanzenart passenden Standort ohne ungünstige Extreme.'},
    {title: 'Zum richtigen Zeitpunkt umtopfen', text: 'Jungpflanzen schrittweise an die Umgebung gewöhnen und bei ausreichender Wurzelbildung umsetzen.'},
  ];
}

export function RombergProductGuide({
  product,
  locale,
  related,
}: {
  product: {title: string; handle: string; productType: string};
  locale: Locale;
  related: RombergProduct[];
}) {
  const english = locale === 'en';
  const prefix = english ? '/en' : '';
  const tips = adviceFor(product.title, product.productType, english);

  return (
    <div className="romberg-pdp">
      <section className="romberg-pdp__guide" aria-labelledby="romberg-guide-heading">
        <header className="romberg-pdp__heading">
          <p className="page-eyebrow">Romberg · {english ? 'Growing guide' : 'Anzuchtwissen'}</p>
          <h2 id="romberg-guide-heading">{english ? 'Get more from your growing setup.' : 'Das Beste aus deiner Anzucht herausholen.'}</h2>
          <p>{english
            ? 'A few practical checks can make seed starting more predictable, regardless of the product you choose.'
            : 'Mit einigen einfachen Prüfungen lässt sich die Anzucht besser steuern – unabhängig von der gewählten Ausstattung.'}</p>
        </header>
        <div className="romberg-pdp__tips">
          {tips.map((item, index) => (
            <article key={item.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      {related.length ? (
        <section className="romberg-brand--commerce romberg-pdp__related" aria-labelledby="romberg-related-heading">
          <div className="romberg-pdp__related-header">
            <div>
              <p className="page-eyebrow">{english ? 'Continue growing' : 'Passend zum Anzuchtprojekt'}</p>
              <h2 id="romberg-related-heading">{english ? 'More from Romberg' : 'Weitere Romberg-Produkte'}</h2>
            </div>
            <Link to={prefix + (english ? '/brands/romberg' : '/marken/romberg')}>
              {english ? 'Explore Romberg range' : 'Romberg-Sortiment ansehen'} <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="romberg-range__grid">
            {related.map((item) => <RombergProductCard key={item.id} product={item} locale={locale} />)}
          </div>
        </section>
      ) : (
        <p className="romberg-pdp__back">
          <Link to={prefix + (english ? '/brands/romberg' : '/marken/romberg')}>
            {english ? 'View all Romberg products' : 'Alle Romberg-Produkte ansehen'} <span aria-hidden="true">↗</span>
          </Link>
        </p>
      )}
    </div>
  );
}
