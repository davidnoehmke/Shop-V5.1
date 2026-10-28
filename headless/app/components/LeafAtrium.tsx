import {Link} from 'react-router';

type Locale = 'de' | 'en';

type WorldCard = {
  key: string;
  titleDe: string;
  titleEn: string;
  textDe: string;
  textEn: string;
  hrefDe: string;
  hrefEn: string;
  house?: string;
  houseHrefDe?: string;
  houseHrefEn?: string;
  tone: string;
};

const WORLDS: WorldCard[] = [
  {
    key: 'substrate',
    titleDe: 'Substrate Lab',
    titleEn: 'Substrate Lab',
    textDe: 'Fertigmischungen, Einzelbestandteile und dein eigener 100-%-Mix.',
    textEn: 'Ready mixes, individual components and your own 100% recipe.',
    hrefDe: '/collections/substratwelt-pflanzsubstrate-mischungen-zusatze',
    hrefEn: '/en/substrate',
    tone: 'earth',
  },
  {
    key: 'light',
    titleDe: 'Light Studio',
    titleEn: 'Light Studio',
    textDe: 'Pflanzenlicht nach Fläche, Abstand und realem Bedarf verstehen.',
    textEn: 'Understand grow lighting by area, distance and real plant needs.',
    hrefDe: '/welten/licht',
    hrefEn: '/en/worlds/light',
    house: 'Venso',
    houseHrefDe: '/marken/venso',
    houseHrefEn: '/en/brands/venso',
    tone: 'light',
  },
  {
    key: 'water',
    titleDe: 'Water Systems',
    titleEn: 'Water Systems',
    textDe: 'Von Einzelpflanzen bis zur Tropfanlage: Bewässerung als System.',
    textEn: 'From single pots to drip systems: irrigation as a system.',
    hrefDe: '/welten/bewaesserung',
    hrefEn: '/en/worlds/water',
    house: 'Blumat',
    houseHrefDe: '/marken/blumat',
    houseHrefEn: '/en/brands/blumat',
    tone: 'water',
  },
  {
    key: 'containers',
    titleDe: 'Plant Container Gallery',
    titleEn: 'Plant Container Gallery',
    textDe: 'Gefäße als Teil des Pflanzen-Setups: Größe, Funktion und Raumwirkung.',
    textEn: 'Containers as part of the plant setup: size, function and interior fit.',
    hrefDe: '/welten/gefaesse',
    hrefEn: '/en/worlds/containers',
    house: 'elho',
    houseHrefDe: '/marken/elho',
    houseHrefEn: '/en/brands/elho',
    tone: 'gallery',
  },
  {
    key: 'propagation',
    titleDe: 'Propagation Lab',
    titleEn: 'Propagation Lab',
    textDe: 'Anzucht, Keimung, Mikroklima und Wärme als klarer Prozess.',
    textEn: 'Propagation, germination, microclimate and warmth as a clear process.',
    hrefDe: '/welten/anzucht',
    hrefEn: '/en/worlds/propagation',
    house: 'Romberg',
    houseHrefDe: '/marken/romberg',
    houseHrefEn: '/en/brands/romberg',
    tone: 'lab',
  },
  {
    key: 'knowledge',
    titleDe: 'LEAF Archiv',
    titleEn: 'LEAF Archive',
    textDe: 'Ratgeber, Materialkunde und Pflanzenwissen statt bloßer Produkttexte.',
    textEn: 'Guides, material knowledge and plant care beyond product copy.',
    hrefDe: '/blogs',
    hrefEn: '/en/blogs',
    tone: 'archive',
  },
];

export function LeafAtrium({locale = 'de'}: {locale?: Locale}) {
  const isEnglish = locale === 'en';

  return (
    <div className="leaf-campus">
      <section className="leaf-atrium" aria-labelledby="leaf-atrium-title">
        <div className="leaf-atrium__copy">
          <p className="page-eyebrow">{isEnglish ? 'LEAF Campus · Atrium' : 'LEAF Campus · Atrium'}</p>
          <h1 id="leaf-atrium-title">
            {isEnglish
              ? 'Start with what your plant needs — not with a product shelf.'
              : 'Starte mit dem, was deine Pflanze braucht – nicht mit einem Produktregal.'}
          </h1>
          <p>
            {isEnglish
              ? 'The atrium is the neutral starting point. Choose a problem space, enter a curated world and discover specialist brand houses inside it.'
              : 'Das Atrium ist der neutrale Startpunkt. Wähle eine Aufgabe, betrete eine kuratierte Themenwelt und entdecke darin die spezialisierten Markenhäuser.'}
          </p>
        </div>
        <nav className="leaf-atrium__map" aria-label={isEnglish ? 'LEAF Campus map' : 'LEAF Campus Übersicht'}>
          {WORLDS.map((world, index) => (
            <Link
              className={'leaf-atrium__map-item leaf-atrium__map-item--' + world.tone}
              key={world.key}
              to={isEnglish ? world.hrefEn : world.hrefDe}
              prefetch="intent"
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{isEnglish ? world.titleEn : world.titleDe}</strong>
            </Link>
          ))}
        </nav>
      </section>

      <section id="leaf-worlds" className="leaf-campus-worlds" aria-labelledby="leaf-worlds-title">
        <div className="leaf-campus-worlds__intro">
          <p className="page-eyebrow">{isEnglish ? 'Districts' : 'Themenwelten'}</p>
          <h2 id="leaf-worlds-title">
            {isEnglish ? 'One campus. Different worlds.' : 'Ein Campus. Unterschiedliche Welten.'}
          </h2>
        </div>
        <div className="leaf-campus-worlds__grid">
          {WORLDS.map((world) => (
            <article className={'leaf-world-card leaf-world-card--' + world.tone} key={world.key}>
              <div>
                <p className="leaf-world-card__kicker">{isEnglish ? 'LEAF world' : 'LEAF Welt'}</p>
                <h3>{isEnglish ? world.titleEn : world.titleDe}</h3>
                <p>{isEnglish ? world.textEn : world.textDe}</p>
              </div>
              <div className="leaf-world-card__actions">
                <Link to={isEnglish ? world.hrefEn : world.hrefDe} prefetch="intent">
                  {isEnglish ? 'Enter world →' : 'Welt betreten →'}
                </Link>
                {world.house && world.houseHrefDe && world.houseHrefEn ? (
                  <Link className="leaf-world-card__house" to={isEnglish ? world.houseHrefEn : world.houseHrefDe} prefetch="intent">
                    {isEnglish ? 'Brand house:' : 'Markenhaus:'} {world.house}
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
