import {Image, Money} from '@shopify/hydrogen';
import {Link} from 'react-router';
import {groupRombergProducts, rombergSummary} from '~/lib/romberg-world';

type Locale = 'de' | 'en';

export type RombergProduct = {
  id: string;
  handle: string;
  title: string;
  description: string;
  productType: string;
  availableForSale: boolean;
  shortClaim?: {value: string} | null;
  featuredImage: {
    id?: string | null;
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
  priceRange: {
    minVariantPrice: {amount: string; currencyCode: string};
  };
};

const CATEGORIES = {
  boqube: {
    de: {
      heading: 'BoQube Zimmergewächshäuser',
      intro: 'Kompakte Gewächshäuser für die Aussaat und die geschützte Anzucht von Stecklingen.',
    },
    en: {
      heading: 'BoQube propagators',
      intro: 'Compact propagators for seed starting and protected cutting propagation.',
    },
  },
  houses: {
    de: {
      heading: 'Anzuchthäuser & Komplettlösungen',
      intro: 'Verschiedene Größen und Ausführungen für Fensterbank, Regal oder Anzuchtstation.',
    },
    en: {
      heading: 'Propagation houses & starter kits',
      intro: 'Choose a suitable size and configuration for your windowsill or growing area.',
    },
  },
  essentials: {
    de: {
      heading: 'Anzuchtzubehör & Sets',
      intro: 'Quelltabletten, ergänzende Wärme und Sets für einen durchdachten Start.',
    },
    en: {
      heading: 'Growing essentials & sets',
      intro: 'Coir plugs, supplemental warmth and practical sets for starting seeds.',
    },
  },
} as const;

export function RombergProductCard({
  product,
  locale,
}: {
  product: RombergProduct;
  locale: Locale;
}) {
  const english = locale === 'en';
  const productUrl = (english ? '/en' : '') + '/products/' + product.handle;
  const summary = rombergSummary(product.shortClaim?.value || product.description, 136);

  return (
    <article className="romberg-product-card">
      <Link to={productUrl} className="romberg-product-card__link" prefetch="intent">
        <span className="romberg-product-card__media">
          {product.featuredImage ? (
            <Image
              data={product.featuredImage}
              alt={product.featuredImage.altText || product.title}
              sizes="(min-width: 1180px) 260px, (min-width: 700px) 40vw, 85vw"
              loading="lazy"
            />
          ) : (
            <span className="romberg-product-card__missing" aria-hidden="true">LEAF</span>
          )}
        </span>
        <span className="romberg-product-card__body">
          <span className="romberg-product-card__type">{product.productType || 'Romberg'}</span>
          <span className="romberg-product-card__name">{product.title}</span>
          {summary ? <span className="romberg-product-card__summary">{summary}</span> : null}
          <span className="romberg-product-card__footer">
            <span className="romberg-product-card__price">
              <Money data={product.priceRange.minVariantPrice} />
            </span>
            <span className="romberg-product-card__arrow" aria-hidden="true">↗</span>
          </span>
        </span>
      </Link>
      <span className={'romberg-product-card__availability' + (product.availableForSale ? ' is-available' : '')}>
        <span aria-hidden="true" />
        {product.availableForSale
          ? (english ? 'Available to order' : 'Bestellbar')
          : (english ? 'Currently unavailable' : 'Derzeit nicht bestellbar')}
      </span>
    </article>
  );
}

export function RombergWorld({
  products,
  locale,
}: {
  products: RombergProduct[];
  locale: Locale;
}) {
  const english = locale === 'en';
  const prefix = english ? '/en' : '';
  const groups = groupRombergProducts(products);
  const heroProduct =
    products.find((item) => /\bboqube\b/i.test(item.title) && item.featuredImage) ||
    products.find((item) => Boolean(item.featuredImage));
  const hero = heroProduct?.featuredImage;

  return (
    <div className="page-shell romberg-brand romberg-brand--commerce">
      <nav aria-label={english ? 'Breadcrumb' : 'Brotkrümelnavigation'} className="romberg-breadcrumbs">
        <Link to={prefix || '/'}>{english ? 'Home' : 'Startseite'}</Link>
        <span aria-hidden="true">/</span>
        <Link to={prefix + '/collections'}>{english ? 'Shop' : 'Sortiment'}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Romberg</span>
      </nav>

      <header className="romberg-hero" aria-labelledby="romberg-heading">
        <div className="romberg-hero__copy">
          <p className="page-eyebrow">Romberg · {english ? 'seed starting & propagation' : 'Anzucht & Pflanzenvermehrung'}</p>
          <h1 id="romberg-heading">
            {english ? 'A good start for every young plant.' : 'Ein guter Start für jede Jungpflanze.'}
          </h1>
          <p className="romberg-hero__lead">
            {english
              ? 'From a compact windowsill propagator to coir plugs and supplementary warmth: discover Romberg products for a well-planned seed-starting setup.'
              : 'Vom kompakten Zimmergewächshaus über Kokos-Quelltabletten bis zur ergänzenden Wärme: Entdecke Romberg-Produkte für eine gut geplante Anzucht.'}
          </p>
          <div className="romberg-hero__actions">
            {products.length ? (
              <a className="romberg-cta" href="#romberg-sortiment">
                {english ? 'Explore the range' : 'Produkte entdecken'}
                <span aria-hidden="true">↗</span>
              </a>
            ) : null}
            <span className="romberg-hero__count">
              {products.length} {english ? 'products in this range' : 'Produkte im Sortiment'}
            </span>
          </div>
        </div>
        <div className="romberg-hero__visual">
          {hero ? (
            <Image
              data={hero}
              alt={hero.altText || heroProduct?.title || 'Romberg'}
              sizes="(min-width: 1000px) 580px, (min-width: 700px) 45vw, 92vw"
              loading="eager"
            />
          ) : (
            <div className="romberg-hero__placeholder" aria-hidden="true">LEAF</div>
          )}
        </div>
      </header>

      <section className="romberg-path" aria-labelledby="romberg-path-heading">
        <div className="romberg-section-heading">
          <p className="page-eyebrow">{english ? 'How it works' : 'Anzucht als System'}</p>
          <h2 id="romberg-path-heading">
            {english ? 'From seed to seedling in three steps.' : 'Von der Aussaat zur Jungpflanze – in drei Schritten.'}
          </h2>
        </div>
        <div className="romberg-steps">
          <article>
            <b>01</b>
            <h3>{english ? 'Start' : 'Aussäen'}</h3>
            <p>{english ? 'Choose a suitable starting medium and keep moisture consistent.' : 'Geeignetes Anzuchtmedium wählen und gleichmäßig feucht halten.'}</p>
          </article>
          <article>
            <b>02</b>
            <h3>{english ? 'Protect' : 'Schützen'}</h3>
            <p>{english ? 'Use a propagator to maintain humidity, with regular ventilation.' : 'Mit einem Zimmergewächshaus die Feuchte halten und regelmäßig lüften.'}</p>
          </article>
          <article>
            <b>03</b>
            <h3>{english ? 'Grow on' : 'Weiterkultivieren'}</h3>
            <p>{english ? 'Check light and temperature before transplanting young plants.' : 'Licht und Temperatur prüfen, bevor Jungpflanzen weitergetopft werden.'}</p>
          </article>
        </div>
      </section>

      <section id="romberg-sortiment" className="romberg-range" aria-labelledby="romberg-products-heading">
        <div className="romberg-section-heading">
          <p className="page-eyebrow">{english ? 'Original Romberg products' : 'Romberg-Produkte'}</p>
          <h2 id="romberg-products-heading">{english ? 'Find your growing setup.' : 'Die passende Lösung für deine Anzucht.'}</h2>
          <p>{english ? 'All shown items and prices are loaded directly from our current Shopify catalogue.' : 'Alle angezeigten Produkte und Preise werden direkt aus dem aktuellen Shopify-Sortiment geladen.'}</p>
        </div>
        {groups.length > 1 ? (
          <nav className="romberg-range__nav" aria-label={english ? 'Product groups' : 'Produktgruppen'}>
            {groups.map((group) => (
              <a href={'#romberg-' + group.key} key={group.key}>
                {CATEGORIES[group.key][locale].heading}
                <span>{group.products.length}</span>
              </a>
            ))}
          </nav>
        ) : null}

        {!products.length ? (
          <p role="status" className="romberg-range__empty">
            {english
              ? 'Romberg products are temporarily not available in this storefront. Please explore our seed-starting range.'
              : 'Aktuell sind hier keine Romberg-Produkte im Storefront-Sortiment verfügbar. Entdecke alternativ unsere Anzuchtwelt.'}
            {' '}
            <Link to={prefix + '/collections/anzucht-aussaat'}>
              {english ? 'Seed starting & propagation' : 'Anzucht & Aussaat'}
            </Link>
          </p>
        ) : null}

        {groups.map((group) => (
          <div className="romberg-range__group" key={group.key} id={'romberg-' + group.key}>
            <div className="romberg-range__group-heading">
              <h3>{CATEGORIES[group.key][locale].heading}</h3>
              <p>{CATEGORIES[group.key][locale].intro}</p>
            </div>
            <div className="romberg-range__grid">
              {group.products.map((product) => (
                <RombergProductCard product={product} locale={locale} key={product.id} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="romberg-advice" aria-labelledby="romberg-advice-heading">
        <div>
          <p className="page-eyebrow">{english ? 'Growing advice' : 'Pflanzenwissen'}</p>
          <h2 id="romberg-advice-heading">
            {english ? 'What matters when starting seeds?' : 'Was ist bei der Aussaat wichtig?'}
          </h2>
          <p>
            {english
              ? 'Even a well-equipped propagator needs the right moisture, temperature and light. Check condensation and ventilate regularly. A heat mat is an aid, not a substitute for sufficient light.'
              : 'Auch mit Zimmergewächshaus zählen die richtige Feuchtigkeit, Temperatur und ausreichend Licht. Kondenswasser kontrollieren und regelmäßig lüften. Eine Heizmatte unterstützt die Anzucht, ersetzt aber kein Licht.'}
          </p>
          <Link to={prefix + '/collections/anzucht-aussaat'}>
            {english ? 'More seed-starting products' : 'Weitere Produkte zur Anzucht'} <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="romberg-advice__questions">
          <details>
            <summary>{english ? 'How often should I ventilate my propagator?' : 'Wie oft sollte ich das Zimmergewächshaus lüften?'}</summary>
            <p>{english ? 'Ventilate regularly and check moisture. Condensation may be normal, but prolonged very wet conditions increase the risk of mould.' : 'Regelmäßig lüften und die Feuchtigkeit prüfen. Kondenswasser kann normal sein, dauerhaft sehr nasse Bedingungen erhöhen aber das Schimmelrisiko.'}</p>
          </details>
          <details>
            <summary>{english ? 'When is supplemental warmth useful?' : 'Wann ist eine Heizmatte sinnvoll?'}</summary>
            <p>{english ? 'When the growing area is cool and the chosen species benefits from warmer germination conditions. Always check temperature and the manufacturer’s instructions.' : 'Wenn der Standort kühl ist und die Pflanzenart höhere Keimtemperaturen benötigt. Temperatur und Herstellerangaben regelmäßig prüfen.'}</p>
          </details>
          <details>
            <summary>{english ? 'What happens after germination?' : 'Was passiert nach dem Keimen?'}</summary>
            <p>{english ? 'Provide sufficient light, gradually reduce humidity and move seedlings into an appropriate growing medium when they are ready.' : 'Für ausreichend Licht sorgen, Luftfeuchtigkeit schrittweise anpassen und die Jungpflanzen bei passender Entwicklung in ein geeignetes Substrat umsetzen.'}</p>
          </details>
        </div>
      </section>
    </div>
  );
}
