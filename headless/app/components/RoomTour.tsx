import {useState} from 'react';
import {Link} from 'react-router';
import story from '~/lib/interior-story.json';

const zones = [
  'overview',
  'plants',
  'planter',
  'light',
  'terrarium',
  'vertical',
] as const;
const destinations = [
  '#room-planner',
  '/collections/zimmerpflanzen-1',
  '/products/leafer-substrat-konfigurator',
  '/collections/pflanzenbeleuchtung',
  '/collections/sukkulentenwelt',
  '/collections/pflanzenzubehor-rankhilfen',
];
const positions = [
  '50% 50%',
  '31% 50%',
  '38% 63%',
  '54% 34%',
  '76% 53%',
  '68% 28%',
];
export function RoomTour({locale}: {locale: 'de' | 'en'}) {
  const [index, setIndex] = useState(0);
  const t = story[locale] as Record<string, string>;
  const zone = zones[index];
  const href = destinations[index];
  return (
    <section
      id="room-tour"
      className="room-tour"
      aria-labelledby="room-tour-title"
    >
      <p className="page-eyebrow">
        {locale === 'en'
          ? 'Interactive room tour · Six viewpoints'
          : 'Interaktive Raumplanung · Sechs Sprungpunkte'}
      </p>
      <h2 id="room-tour-title">
        {locale === 'en'
          ? 'See how your plant setup fits together.'
          : 'Entdecke, wie dein Pflanzen-Setup zusammenpasst.'}
      </h2>
      <div className="room-tour__layout">
        <div
          className="room-tour__scene"
          style={{backgroundPosition: positions[index]}}
        >
          <nav
            aria-label={
              locale === 'en'
                ? 'Six room viewpoints'
                : 'Sechs Raum-Sprungpunkte'
            }
          >
            {zones.map((id, i) => (
              <button
                type="button"
                key={id}
                aria-pressed={index === i}
                onClick={() => setIndex(i)}
              >
                <span>{String(i).padStart(2, '0')}</span>{' '}
                {t[`hotspot_${id}_label`] || t[`${id}_kicker`]}
              </button>
            ))}
          </nav>
        </div>
        <div className="room-tour__panel" aria-live="polite">
          <span>
            {index + 1} / 6 · {t[`${zone}_kicker`]}
          </span>
          <h3>{t[`${zone}_title`]}</h3>
          <p>{t[`${zone}_copy`]}</p>
          <ul>
            {[1, 2, 3].map((i) => (
              <li key={i}>{t[`${zone}_point_${i}`]}</li>
            ))}
          </ul>
          <Link
            to={locale === 'en' && href.startsWith('/') ? `/en${href}` : href}
          >
            {t[`${zone}_cta`]} →
          </Link>
          <div className="room-tour__controls">
            <button type="button" onClick={() => setIndex((index + 5) % 6)}>
              {t.prev}
            </button>
            <button type="button" onClick={() => setIndex((index + 1) % 6)}>
              {t.next}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
