import {Link, useLoaderData} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {Route} from './+types/marken.venso';

export const meta: Route.MetaFunction = () => [
  {title: 'Venso Pflanzenbeleuchtung | LEAFerservice'},
  {name: 'description', content: 'Venso Pflanzenbeleuchtung entdecken: Modelle, Varianten und passende Einsatzbereiche bei LEAFerservice vergleichen.'},
];

export async function loader({context}: Route.LoaderArgs) {
  const result = await context.storefront.query(VENSO_QUERY, {
    variables: {query: 'vendor:"Venso EcoSolutions GmbH"'},
    cache: context.storefront.CacheShort(),
  });
  return {products: result.products.nodes};
}

export default function VensoBrand() {
  const {products} = useLoaderData<typeof loader>();
  const hero = products.find((product) => product.featuredImage)?.featuredImage;
  return (
    <div className="page-shell venso-brand">
      <nav aria-label="Brotkrümelnavigation"><Link to="/">Startseite</Link> / Venso</nav>
      <section className="venso-hero" aria-labelledby="venso-heading">
        <div>
          <p className="page-eyebrow">Venso · Pflanzenbeleuchtung</p>
          <h1 id="venso-heading">Licht für deinen Pflanzenplatz.</h1>
          <p>Entdecke die verfügbaren Venso-Modelle und vergleiche ihre Varianten. Einsatz, Montage und Lieferumfang findest du beim jeweiligen Produkt.</p>
          <a className="venso-cta" href="#venso-sortiment">Zum Venso-Sortiment ↓</a>
        </div>
        {hero ? <Image data={hero} sizes="(min-width: 768px) 45vw, 100vw" loading="eager" /> : null}
      </section>
      <section id="venso-sortiment" aria-labelledby="venso-products-heading">
        <p className="page-eyebrow">Dein nächster Schritt</p>
        <h2 id="venso-products-heading">Venso entdecken</h2>
        <p>Wähle ein Modell, um Leistung, Varianten, Preis und Verfügbarkeit zu prüfen.</p>
        {!products.length ? <p role="status">Aktuell sind hier keine Venso-Produkte verfügbar.</p> : null}
        <div className="venso-grid">
          {products.map((product) => (
            <article className="venso-card" key={product.id}>
              <Link to={`/products/${product.handle}`} prefetch="intent">
                {product.featuredImage ? <Image data={product.featuredImage} sizes="(min-width: 900px) 30vw, (min-width: 600px) 45vw, 100vw" /> : null}
                <h3>{product.title}</h3>
              </Link>
              {product.shortClaim?.value ? <p>{product.shortClaim.value}</p> : null}
              <p className="venso-price">Ab <Money data={product.priceRange.minVariantPrice} /></p>
              <Link className="venso-product-link" to={`/products/${product.handle}`} prefetch="intent">Produkt & Varianten ansehen →</Link>
            </article>
          ))}
        </div>
      </section>
      <section className="venso-advice">
        <h2>Welches Licht passt zu deinem Aufbau?</h2>
        <p>Vergleiche den vorgesehenen Einsatz, die Montage und den empfohlenen Pflanzenabstand auf der Produktseite. Die Wattzahl allein beschreibt die Ausleuchtung nicht.</p>
        <Link to="/collections/pflanzenbeleuchtung">Gesamte Pflanzenbeleuchtung ansehen →</Link>
      </section>
    </div>
  );
}

const VENSO_QUERY = `#graphql
  query VensoBrand($country: CountryCode, $language: LanguageCode, $query: String!)
  @inContext(country: $country, language: $language) {
    products(first: 100, query: $query, sortKey: TITLE) {
      nodes {
        id handle title
        shortClaim: metafield(namespace: "leafer", key: "short_claim") { value }
        featuredImage { id url altText width height }
        priceRange { minVariantPrice { amount currencyCode } }
      }
    }
  }
` as const;
