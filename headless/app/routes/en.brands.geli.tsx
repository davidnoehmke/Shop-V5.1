import {Link, useLoaderData} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {Route} from './+types/en.brands.geli';

export const meta: Route.MetaFunction = () => [
  {title: 'GELI plant pots and watering | LEAFerservice'},
  {name: 'description', content: 'Explore available GELI planters, orchid pots, saucers and watering accessories at LEAFerservice.'},
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
  if (t.includes('orchidee') || t.includes('orchid')) return 'Orchid pots';
  if (t.includes('untersetzer') || t.includes('pflanzschale')) return 'Saucers & trays';
  if (t.includes('gieß') || t.includes('giess') || t.includes('sprüher') || t.includes('spruher') || t.includes('wasserstand') || t.includes('bewässer')) return 'Watering & care';
  return 'Planters';
}

export default function GeliBrand() {
  const {products} = useLoaderData<typeof loader>();
  const groups = ['Planters', 'Orchid pots', 'Saucers & trays', 'Watering & care'];
  const hero = products.find((p) => p.featuredImage)?.featuredImage;
  const prefix = '/en';
  return (
    <div className="page-shell blumat-brand">
      <nav aria-label="Breadcrumb"><Link to={prefix || '/'}>Home</Link> / GELI</nav>
      <section className="blumat-hero" aria-labelledby="geli-heading">
        <div>
          <p className="page-eyebrow">GELI · Planters & accessories</p>
          <h1 id="geli-heading">The right pot for every planting project.</h1>
          <p>Explore the currently available GELI range: orchid pots, planters, saucers and watering solutions. Product availability and prices come directly from the shop.</p>
          <a className="blumat-cta" href="#geli-products">Explore products ↓</a>
        </div>
        {hero ? <Image data={hero} sizes="(min-width: 768px) 45vw, 100vw" loading="eager" /> : <div className="blumat-hero-placeholder" aria-hidden="true"><span>GELI</span></div>}
      </section>
      <section id="geli-products" aria-labelledby="geli-products-heading">
        <p className="page-eyebrow">Available Shopify products</p>
        <h2 id="geli-products-heading">Find your GELI solution</h2>
        {!products.length && <p role="status">No GELI products are currently available in this sales channel.</p>}
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
              {product.description && <p className="brand-product-description">{product.description.length > 180 ? `${product.description.slice(0, 177)}…` : product.description}</p>}
              {product.images.nodes.length > 1 && <div className="brand-product-images" aria-label="Additional product images">{product.images.nodes.slice(1, 4).map((photo) => <Image key={photo.id} data={photo} sizes="96px" loading="lazy" />)}</div>}
              {product.variants.nodes.length > 1 && <p className="brand-product-variants">Available options: {product.variants.nodes.filter((v) => v.availableForSale).length} / {product.variants.nodes.length}</p>}
              <p className="blumat-price">From <Money data={product.priceRange.minVariantPrice}/></p>
              <Link className="blumat-product-link" to={`${prefix}/products/${product.handle}`}>View product →</Link>
            </article>)}</div>
          </section>;
        })}
      </section>
      <section className="blumat-advice">
        <h2>Choose by plant and growing conditions</h2>
        <p>Consider root space, drainage and watering needs. Compare sizes and variants on the product page.</p>
        <Link to={`${prefix}/collections`}>Explore the complete range →</Link>
      </section>
    </div>
  );
}

const GELI_QUERY = `#graphql
  query EnglishGeliBrand($country: CountryCode, $language: LanguageCode, $query: String!)
  @inContext(country: $country, language: $language) {
    products(first: 100, query: $query, sortKey: TITLE) {
      nodes {
        id handle title
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
