import {Link, useLoaderData} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {Route} from './+types/marken.elho';

export const meta: Route.MetaFunction = () => [
  {title: 'elho Pflanzgefäße & Bewässerung | LEAFerservice'},
  {
    name: 'description',
    content:
      'elho bei LEAFerservice: Pflanzgefäße und Bewässerungslösungen für Zimmerpflanzen entdecken, Größen vergleichen und passende Produkte finden.',
  },
  {name: 'robots', content: 'noindex,nofollow'},
];

export async function loader({context}: Route.LoaderArgs) {
  const result = await context.storefront.query(ELHO_QUERY, {
    variables: {query: 'vendor:"elho"'},
    cache: context.storefront.CacheShort(),
  });

  return {products: result.products.nodes};
}

export default function ElhoBrand() {
  const {products} = useLoaderData<typeof loader>();
  const hero = products.find((product) => product.featuredImage)?.featuredImage;

  return (
    <div className="page-shell elho-brand">
      <nav aria-label="Brotkrümelnavigation">
        <Link to="/">Startseite</Link> / elho
      </nav>

      <section className="elho-hero" aria-labelledby="elho-heading">
        <div>
          <p className="page-eyebrow">elho · Pflanzgefäße & Bewässerung</p>
          <h1 id="elho-heading">Gefäß und Bewässerung als Teil des Pflanzen-Setups.</h1>
          <p>
            Finde die passende Größe und eine sinnvolle Bewässerungslösung für deinen
            Pflanzenplatz. LEAF hilft dir beim Vergleichen, ohne dich zu einem Kauf zu drängen.
          </p>
          <a className="elho-cta" href="#elho-sortiment">elho entdecken ↓</a>
        </div>
        {hero ? (
          <Image data={hero} sizes="(min-width: 768px) 45vw, 100vw" loading="eager" />
        ) : (
          <div className="elho-hero-placeholder" aria-hidden="true">
            <span>elho</span>
          </div>
        )}
      </section>

      <section className="elho-path" aria-labelledby="elho-path-heading">
        <p className="page-eyebrow">So findest du die passende Lösung</p>
        <h2 id="elho-path-heading">Nicht nur nach Optik auswählen.</h2>
        <div className="elho-steps">
          <article>
            <b>01</b>
            <h3>Topfgröße</h3>
            <p>Die Größe sollte zum Wurzelballen und zur Entwicklung der Pflanze passen.</p>
          </article>
          <article>
            <b>02</b>
            <h3>Standort</h3>
            <p>Innenraum, Fensterbank und Gießrhythmus verändern die Anforderungen an das Gefäß.</p>
          </article>
          <article>
            <b>03</b>
            <h3>Bewässerung</h3>
            <p>Reservoir- und Einsatzlösungen können helfen, die Wasserversorgung gleichmäßiger zu gestalten.</p>
          </article>
          <article>
            <b>04</b>
            <h3>Zusammenspiel</h3>
            <p>Gefäß, Substrat und Gießverhalten sollten als System betrachtet werden.</p>
          </article>
        </div>
      </section>

      <section id="elho-sortiment" aria-labelledby="elho-products-heading">
        <p className="page-eyebrow">Aktuell im Shop</p>
        <h2 id="elho-products-heading">elho-Produkte bei LEAFerservice</h2>
        {!products.length ? (
          <p className="elho-preview-note" role="status">
            Aktuell ist noch kein elho-Produkt im Headless-Sortiment verfügbar.
          </p>
        ) : null}

        <div className="elho-grid">
          {products.map((product) => (
            <article className="elho-card" key={product.id}>
              <Link to={`/products/${product.handle}`} prefetch="intent">
                {product.featuredImage ? (
                  <Image
                    data={product.featuredImage}
                    sizes="(min-width: 900px) 30vw, (min-width: 600px) 45vw, 100vw"
                  />
                ) : null}
                <h3>{product.title}</h3>
              </Link>
              {product.shortClaim?.value ? <p>{product.shortClaim.value}</p> : null}
              <p className="elho-price">
                Ab <Money data={product.priceRange.minVariantPrice} />
              </p>
              <Link className="elho-product-link" to={`/products/${product.handle}`} prefetch="intent">
                Produkt & Größen ansehen →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="elho-advice" aria-labelledby="elho-advice-heading">
        <p className="page-eyebrow">Mit LEAF finden statt suchen</p>
        <h2 id="elho-advice-heading">Unsicher bei Größe oder Bewässerung?</h2>
        <p>
          Frag LEAF nach einer passenden Richtung oder lass dir relevante Seiten und Ratgeber öffnen.
          Der Assistent kann auch einfach erklären, ohne dir ein Produkt zu empfehlen.
        </p>
        <Link to="/collections/pflanzgefasse">Pflanzgefäße ansehen →</Link>
      </section>
    </div>
  );
}

const ELHO_QUERY = `#graphql
  query ElhoBrand($country: CountryCode, $language: LanguageCode, $query: String!)
  @inContext(country: $country, language: $language) {
    products(first: 100, query: $query, sortKey: TITLE) {
      nodes {
        id
        handle
        title
        shortClaim: metafield(namespace: "leafer", key: "short_claim") { value }
        featuredImage { id url altText width height }
        priceRange { minVariantPrice { amount currencyCode } }
      }
    }
  }
` as const;
