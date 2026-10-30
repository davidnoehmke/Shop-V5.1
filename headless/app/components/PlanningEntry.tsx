import {Link} from 'react-router';

export function PlanningEntry({locale = 'de'}: {locale?: 'de' | 'en'}) {
  const en = locale === 'en';
  const base = en ? '/en/planning' : '/raumplanung';
  return (
    <section
      className="planning-entry"
      aria-label={en ? 'Room planning tools' : 'Werkzeuge zur Raumplanung'}
    >
      <div>
        <p className="page-eyebrow">
          {en
            ? 'Your room. Your plant setup.'
            : 'Dein Raum. Dein Pflanzen-Setup.'}
        </p>
        <h2>
          {en
            ? 'Plan first. Find the right products.'
            : 'Erst planen. Dann passend auswählen.'}
        </h2>
      </div>
      <div className="planning-entry__grid">
        <Link to={`${base}#room-tour`} prefetch="intent">
          <span>01</span>
          <h3>{en ? 'Explore the room' : 'Raumplanung entdecken'}</h3>
          <p>
            {en
              ? 'Six interactive viewpoints connect plants, containers and light.'
              : 'Sechs interaktive Sprungpunkte verbinden Pflanzen, Gefäße und Licht.'}
          </p>
          <strong>
            {en ? 'Explore six viewpoints →' : 'Sechs Sprungpunkte erkunden →'}
          </strong>
        </Link>
        <Link to={`${base}#room-planner`} prefetch="intent">
          <span>02</span>
          <h3>{en ? '3D room planner' : '3D-Raumplanung'}</h3>
          <p>
            {en
              ? 'Set room dimensions, position objects and assemble your setup.'
              : 'Raummaße eingeben, Objekte platzieren und dein Setup zusammenstellen.'}
          </p>
          <strong>{en ? 'Start planning →' : 'Planung starten →'}</strong>
        </Link>
      </div>
    </section>
  );
}
