import {Link, useLoaderData} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {Route} from './+types/marken.blumat';

export const meta: Route.MetaFunction = () => [
  {title: 'Blumat Bewässerungssysteme | LEAFerservice'},
  {
    name: 'description',
    content:
      'Blumat bei LEAFerservice: Classic, Easy, Tropf-Blumat, Digital und Zubehör für bedarfsgerechte Pflanzenbewässerung im Überblick.',
  },
  {name: 'robots', content: 'noindex,nofollow'},
];

export async function loader({context}: Route.LoaderArgs) {
  const result = await context.storefront.query(BLUMAT_QUERY, {
    variables: {query: 'vendor:"Blumat"'},
    cache: context.storefront.CacheShort(),
  });

  return {products: result.products.nodes};
}

function groupFor(title: string) {
  const value = title.toLowerCase();
  if (value.includes('digital')) return 'Messen & kontrollieren';
  if (value.includes('classic') || value.includes('easy')) return 'Einzelpflanzen & Urlaub';
  if (value.includes('tropf-blumat') || value.includes('set12') || value.includes('set40')) {
    return 'Tropfbewässerung';
  }
  return 'Systemzubehör';
}

export default function BlumatBrand() {
  const {products} = useLoaderData<typeof loader>();
  const hero = products.find((product) => product.featuredImage)?.featuredImage;
  const groups = ['Einzelpflanzen & Urlaub', 'Tropfbewässerung', 'Messen & kontrollieren', 'Systemzubehör'];

  return (
    <div className="page-shell blumat-brand">
      <nav aria-label="Brotkrümelnavigation">
        <Link to="/">Startseite</Link> / Blumat
      </nav>

      <section className="blumat-hero" aria-labelledby="blumat-heading">
        <div>
          <p className="page-eyebrow">Blumat · Bewässerung als System</p>
          <h1 id="blumat-heading">Von der einzelnen Zimmerpflanze bis zur Tropfanlage.</h1>
          <p>
            Blumat deckt mehrere Bewässerungsaufgaben ab: einfache Lösungen für einzelne Töpfe,
            Tropfbewässerung für mehrere Pflanzen sowie Mess- und Systemzubehör.
          </p>
          <a className="blumat-cta" href="#blumat-sortiment">Blumat entdecken ↓</a>
        </div>
        {hero ? (
          <Image data={hero} sizes="(min-width: 768px) 45vw, 100vw" loading="eager" />
        ) : (
          <div className="blumat-hero-placeholder" aria-hidden="true"><span>Blumat</span></div>
        )}
      </section>

      <section className="blumat-path" aria-labelledby="blumat-path-heading">
        <p className="page-eyebrow">Welcher Einstieg passt?</p>
        <h2 id="blumat-path-heading">Erst die Bewässerungsaufgabe klären.</h2>
        <div className="blumat-steps">
          <article>
            <b>01</b>
            <h3>Einzelne Topfpflanzen</h3>
            <p>Classic und Easy richten sich an überschaubare Setups und einzelne Pflanzen.</p>
          </article>
          <article>
            <b>02</b>
            <h3>Mehrere Pflanzen</h3>
            <p>Tropf-Blumat bildet die Basis für erweiterbare Bewässerungsanlagen.</p>
          </article>
          <article>
            <b>03</b>
            <h3>Feuchte kontrollieren</h3>
            <p>Blumat Digital ergänzt die Bewässerung um eine messbare Feuchtekontrolle.</p>
          </article>
          <article>
            <b>04</b>
            <h3>System erweitern</h3>
            <p>Schläuche, Anschlüsse, Tropfer und Ventile bauen bestehende Anlagen passend aus.</p>
          </article>
        </div>
      </section>

      <section id="blumat-sortiment" aria-labelledby="blumat-products-heading">
        <p className="page-eyebrow">Aktuelles Shopify-Sortiment</p>
        <h2 id="blumat-products-heading">Blumat nach Aufgabe entdecken</h2>
        {!products.length ? <p role="status">Aktuell sind keine Blumat-Produkte verfügbar.</p> : null}

        {groups.map((group) => {
          const items = products.filter((product) => groupFor(product.title) === group);
          if (!items.length) return null;
          return (
            <section className="blumat-group" key={group} aria-labelledby={`blumat-${group.replace(/\W+/g, '-').toLowerCase()}`}>
              <h3 id={`blumat-${group.replace(/\W+/g, '-').toLowerCase()}`}>{group}</h3>
              <div className="blumat-grid">
                {items.map((product) => (
                  <article className="blumat-card" key={product.id}>
                    <Link to={`/products/${product.handle}`} prefetch="intent">
                      {product.featuredImage ? (
                        <Image
                          data={product.featuredImage}
                          sizes="(min-width: 1000px) 23vw, (min-width: 650px) 45vw, 100vw"
                        />
                      ) : null}
                      <h4>{product.title}</h4>
                    </Link>
                    {product.shortClaim?.value ? <p>{product.shortClaim.value}</p> : null}
              {product.description && <p className="brand-product-description">{product.description.length > 180 ? `${product.description.slice(0, 177)}…` : product.description}</p>}
              {product.images.nodes.length > 1 && <div className="brand-product-images" aria-label="Weitere Produktbilder">{product.images.nodes.slice(1, 4).map((photo) => <Image key={photo.id} data={photo} sizes="96px" loading="lazy" />)}</div>}
              {product.variants.nodes.length > 1 && <p className="brand-product-variants">Varianten: {product.variants.nodes.filter((v) => v.availableForSale).length} / {product.variants.nodes.length}</p>}
                    <p className="blumat-price">Ab <Money data={product.priceRange.minVariantPrice} /></p>
                    <Link className="blumat-product-link" to={`/products/${product.handle}`} prefetch="intent">
                      Produkt ansehen →
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </section>

      <section className="blumat-advice" aria-labelledby="blumat-advice-heading">
        <p className="page-eyebrow">Nicht sicher, welches System?</p>
        <h2 id="blumat-advice-heading">LEAF kann zuerst dein Bewässerungsproblem einordnen.</h2>
        <p>
          Beschreibe Anzahl der Pflanzen, Topfgröße und deine typische Gießsituation. LEAF kann
          passende Inhalte und Produktwege erklären, ohne automatisch etwas verkaufen zu wollen.
        </p>
        <Link to="/collections/pflanzenpflege-werkzeuge">Bewässerung & Pflanzenpflege ansehen →</Link>
      </section>
    </div>
  );
}

const BLUMAT_QUERY = `#graphql
  query BlumatBrand($country: CountryCode, $language: LanguageCode, $query: String!)
  @inContext(country: $country, language: $language) {
    products(first: 100, query: $query, sortKey: TITLE) {
      nodes {
        id
        handle
        title
        shortClaim: metafield(namespace: "leafer", key: "short_claim") { value }
        description(truncateAt: 600)
        images(first: 4) { nodes { id url altText width height } }
        variants(first: 20) { nodes { id availableForSale } }
        featuredImage { id url altText width height }
        priceRange { minVariantPrice { amount currencyCode } }
      }
    }
  }
` as const;
