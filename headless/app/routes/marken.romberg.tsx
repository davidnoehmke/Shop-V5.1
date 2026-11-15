import {Link, useLoaderData} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {Route} from './+types/marken.romberg';

export const meta: Route.MetaFunction = () => [
  {title: 'Romberg Anzucht & Pflanzenvermehrung | LEAFerservice'},
  {
    name: 'description',
    content:
      'Romberg Anzuchtlösungen bei LEAFerservice: BoQube Zimmergewächshäuser, Kokos-Quelltabletten und Heizmatten für Aussaat und Stecklingsvermehrung.',
  },
  {name: 'robots', content: 'noindex,nofollow'},
];

const PREVIEW_PRODUCTS = [
  {
    id: 'romberg:16294166',
    handle: 'romberg-boqube-s-zimmergewachshaus',
    title: 'Romberg BoQube S Zimmergewächshaus',
    image: 'https://cdn.shopify.com/s/files/1/0949/8876/3521/files/romberg-boqube-s.jpg?v=1793171367',
    price: '7,99 €',
    claim: 'Kompaktes Zimmergewächshaus für bis zu 8 Quelltabletten.',
  },
  {
    id: 'romberg:16294165',
    handle: 'romberg-boqube-m-zimmergewachshaus',
    title: 'Romberg BoQube M Zimmergewächshaus',
    image: 'https://cdn.shopify.com/s/files/1/0949/8876/3521/files/romberg-boqube-m.jpg?v=1793171374',
    price: '9,99 €',
    claim: 'Mehr Platz für Aussaat und Stecklinge – bis zu 18 Quelltabletten.',
  },
  {
    id: 'romberg:10091021',
    handle: 'romberg-kokos-quelltabletten-50-stuck',
    title: 'Romberg Kokos-Quelltabletten 50 Stück',
    image: 'https://cdn.shopify.com/s/files/1/0949/8876/3521/files/romberg-kokos-quelltabletten-50.jpg?v=1793171381',
    price: '8,49 €',
    claim: '50 Kokos-Quelltabletten für Aussaat und Stecklingsvermehrung.',
  },
  {
    id: 'romberg:16293121',
    handle: 'romberg-heizmatte-s-style-40-x-15-cm-14-w',
    title: 'Romberg Heizmatte S STYLE 40 × 15 cm 14 W',
    image: 'https://cdn.shopify.com/s/files/1/0949/8876/3521/files/romberg-heizmatte-s-style.jpg?v=1793171388',
    price: '29,95 €',
    claim: 'Wärmeunterstützung für die kontrollierte Indoor-Anzucht.',
  },
] as const;

export async function loader({context}: Route.LoaderArgs) {
  const result = await context.storefront.query(ROMBERG_QUERY, {
    variables: {query: 'vendor:"Romberg GmbH & Co. KG"'},
    cache: context.storefront.CacheShort(),
  });

  return {products: result.products.nodes};
}

export default function RombergBrand() {
  const {products} = useLoaderData<typeof loader>();
  const hasLiveProducts = products.length > 0;
  const hero = products.find((product) => product.featuredImage)?.featuredImage;

  return (
    <div className="page-shell romberg-brand">
      <nav aria-label="Brotkrümelnavigation">
        <Link to="/">Startseite</Link> / Romberg
      </nav>

      <section className="romberg-hero" aria-labelledby="romberg-heading">
        <div>
          <p className="page-eyebrow">Romberg · Anzucht & Pflanzenvermehrung</p>
          <h1 id="romberg-heading">Vom Samen bis zum kräftigen Jungtrieb.</h1>
          <p>
            BoQube Zimmergewächshäuser, Kokos-Quelltabletten und Wärmeunterstützung
            bilden eine verständliche Anzuchtwelt für Fensterbank und Indoor-Setup.
          </p>
          <a className="romberg-cta" href="#romberg-sortiment">
            Romberg entdecken ↓
          </a>
        </div>
        {hero ? (
          <Image data={hero} sizes="(min-width: 768px) 45vw, 100vw" loading="eager" />
        ) : (
          <img
            src={PREVIEW_PRODUCTS[0].image}
            alt="Romberg BoQube S Zimmergewächshaus"
            loading="eager"
          />
        )}
      </section>

      <section className="romberg-path" aria-labelledby="romberg-path-heading">
        <p className="page-eyebrow">Anzucht als System</p>
        <h2 id="romberg-path-heading">Vier Bausteine, ein klarer Ablauf.</h2>
        <div className="romberg-steps">
          <article><b>01</b><h3>Keimen</h3><p>Quelltabletten schaffen einen sauberen Startpunkt für Samen und Stecklinge.</p></article>
          <article><b>02</b><h3>Mikroklima</h3><p>BoQube S und M bündeln Luftfeuchte, Wärme und Licht auf kleinem Raum.</p></article>
          <article><b>03</b><h3>Temperatur</h3><p>Eine Heizmatte unterstützt empfindliche Kulturen bei kühler Umgebung.</p></article>
          <article><b>04</b><h3>Weiterkultivieren</h3><p>Nach der Anzucht geht es in Topf, Substrat und passende Beleuchtung weiter.</p></article>
        </div>
      </section>

      <section id="romberg-sortiment" aria-labelledby="romberg-products-heading">
        <p className="page-eyebrow">Startsortiment</p>
        <h2 id="romberg-products-heading">Romberg für deine Anzucht</h2>
        {!hasLiveProducts ? (
          <p className="romberg-preview-note" role="status">
            Preview: Die Romberg-Produkte sind bereits als Shopify-Drafts angelegt.
            Kauf-Links werden erst nach der finalen Beschaffungs- und Rechteprüfung aktiviert.
          </p>
        ) : null}

        <div className="romberg-grid">
          {hasLiveProducts
            ? products.map((product) => (
                <article className="romberg-card" key={product.id}>
                  <Link to={`/products/${product.handle}`} prefetch="intent">
                    {product.featuredImage ? (
                      <Image
                        data={product.featuredImage}
                        sizes="(min-width: 900px) 25vw, (min-width: 600px) 45vw, 100vw"
                      />
                    ) : null}
                    <h3>{product.title}</h3>
                  </Link>
                  {product.shortClaim?.value ? <p>{product.shortClaim.value}</p> : null}
                  <p className="romberg-price">
                    Ab <Money data={product.priceRange.minVariantPrice} />
                  </p>
                  <Link className="romberg-product-link" to={`/products/${product.handle}`}>
                    Produkt ansehen →
                  </Link>
                </article>
              ))
            : PREVIEW_PRODUCTS.map((product) => (
                <article className="romberg-card" key={product.id}>
                  <img src={product.image} alt={product.title} loading="lazy" />
                  <h3>{product.title}</h3>
                  <p>{product.claim}</p>
                  <p className="romberg-price">{product.price}</p>
                  <span className="romberg-draft-badge">Noch nicht veröffentlicht</span>
                </article>
              ))}
        </div>
      </section>

      <section className="romberg-advice">
        <h2>Welche Größe passt?</h2>
        <p>
          BoQube S ist auf sehr schmale Fensterbänke und kleine Aussaatmengen ausgelegt.
          BoQube M bietet mehr Anzuchtplätze und lässt sich sinnvoll mit der Heizmatte S STYLE kombinieren.
        </p>
        <Link to="/collections/anzucht-aussaat">Gesamte Anzucht & Aussaat ansehen →</Link>
      </section>
    </div>
  );
}

const ROMBERG_QUERY = `#graphql
  query RombergBrand($country: CountryCode, $language: LanguageCode, $query: String!)
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
