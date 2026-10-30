import {Link, useLoaderData} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {Route} from './+types/marken.geli';

export const meta: Route.MetaFunction = () => [
  {title: 'GELI Pflanzgefäße & Bewässerung | LEAFerservice'},
  {name: 'description', content: 'GELI Pflanzgefäße, Orchideentöpfe, Untersetzer und Bewässerungszubehör bei LEAFerservice entdecken.'},
  {name: 'robots', content: 'noindex,nofollow'},
];

export async function loader({context}: Route.LoaderArgs) {
  const result = await context.storefront.query(GELI_QUERY, {
    variables: {query: 'vendor:"GELI"'},
    cache: context.storefront.CacheShort(),
  });
  return {products: result.products.nodes};
}

function category(title: string) {
  const t = title.toLowerCase();
  if (t.includes('orchidee') || t.includes('orchid')) return 'Orchideentöpfe';
  if (t.includes('untersetzer') || t.includes('pflanzschale')) return 'Untersetzer & Schalen';
  if (t.includes('gieß') || t.includes('giess') || t.includes('sprüher') || t.includes('spruher') || t.includes('wasserstand') || t.includes('bewässer')) return 'Bewässerung & Pflege';
  return 'Pflanzgefäße';
}

export default function GeliBrand() {
  const {products} = useLoaderData<typeof loader>();
  const groups = ['Pflanzgefäße', 'Orchideentöpfe', 'Untersetzer & Schalen', 'Bewässerung & Pflege'];
  const hero = products.find((p) => p.featuredImage)?.featuredImage;
  const prefix = '';
  return (
    <div className="page-shell blumat-brand">
      <nav aria-label="Brotkrümelnavigation"><Link to={prefix || '/'}>Startseite</Link> / GELI</nav>
      <section className="blumat-hero" aria-labelledby="geli-heading">
        <div>
          <p className="page-eyebrow">GELI · Pflanzgefäße & Zubehör</p>
          <h1 id="geli-heading">Pflanzgefäße passend zur Pflanze auswählen.</h1>
          <p>Entdecke die aktuell verfügbaren GELI-Produkte: Orchideentöpfe, Pflanzgefäße, Untersetzer und Bewässerungslösungen. Preise und Verfügbarkeit stammen direkt aus dem Shop.</p>
          <a className="blumat-cta" href="#geli-products">Sortiment entdecken ↓</a>
        </div>
        {hero ? <Image data={hero} sizes="(min-width: 768px) 45vw, 100vw" loading="eager" /> : <div className="blumat-hero-placeholder" aria-hidden="true"><span>GELI</span></div>}
      </section>
      <section id="geli-products" aria-labelledby="geli-products-heading">
        <p className="page-eyebrow">Verfügbare Shopify-Produkte</p>
        <h2 id="geli-products-heading">GELI nach Einsatzzweck entdecken</h2>
        {!products.length && <p role="status">Aktuell sind über diesen Verkaufskanal keine GELI-Produkte verfügbar.</p>}
        {groups.map((group) => {
          const items = products.filter((p) => category(p.title) === group);
          if (!items.length) return null;
          return <section key={group} className="blumat-group"><h3>{group}</h3>
            <div className="blumat-grid">{items.map((product) => <article className="blumat-card" key={product.id}>
              <Link to={`${prefix}/products/${product.handle}`} prefetch="intent">
                {product.featuredImage && <Image data={product.featuredImage} sizes="(min-width: 1000px) 23vw, (min-width: 650px) 45vw, 100vw" />}
                <h4>{product.title}</h4>
              </Link>
              {product.shortClaim?.value && <p>{product.shortClaim.value}</p>}
              <p className="blumat-price">Ab <Money data={product.priceRange.minVariantPrice}/></p>
              <Link className="blumat-product-link" to={`${prefix}/products/${product.handle}`}>Produkt ansehen →</Link>
            </article>)}</div>
          </section>;
        })}
      </section>
      <section className="blumat-advice">
        <h2>Nicht nur nach Optik auswählen</h2>
        <p>Berücksichtige Wurzelraum, Drainage und Gießverhalten. Größen und Varianten kannst du direkt auf den Produktseiten vergleichen.</p>
        <Link to={`${prefix}/collections`}>Gesamtes Sortiment entdecken →</Link>
      </section>
    </div>
  );
}

const GELI_QUERY = `#graphql
  query GeliBrand($country: CountryCode, $language: LanguageCode, $query: String!)
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
