import {Link, useLoaderData} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {Route} from './+types/en.brands.blumat';

export const meta: Route.MetaFunction = () => [
  {title: 'Blumat plant watering systems | LEAFerservice'},
  {
    name: 'description',
    content:
      'Explore Blumat Classic, Easy, Tropf-Blumat, Digital and system accessories for plant watering at LEAFerservice.',
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
  if (value.includes('digital')) return 'Measure & monitor';
  if (value.includes('classic') || value.includes('easy')) return 'Single plants & holidays';
  if (value.includes('tropf-blumat') || value.includes('set12') || value.includes('set40')) {
    return 'Drip watering';
  }
  return 'System accessories';
}

export default function EnglishBlumatBrand() {
  const {products} = useLoaderData<typeof loader>();
  const hero = products.find((product) => product.featuredImage)?.featuredImage;
  const groups = ['Single plants & holidays', 'Drip watering', 'Measure & monitor', 'System accessories'];

  return (
    <div className="page-shell blumat-brand">
      <nav aria-label="Breadcrumb">
        <Link to="/en">Home</Link> / Blumat
      </nav>

      <section className="blumat-hero" aria-labelledby="blumat-heading-en">
        <div>
          <p className="page-eyebrow">Blumat · watering as a system</p>
          <h1 id="blumat-heading-en">From one houseplant to an expandable drip system.</h1>
          <p>
            Blumat covers several watering jobs: simple solutions for individual pots,
            drip watering for multiple plants and accessories for monitoring and expansion.
          </p>
          <a className="blumat-cta" href="#blumat-range-en">Explore Blumat ↓</a>
        </div>
        {hero ? (
          <Image data={hero} sizes="(min-width: 768px) 45vw, 100vw" loading="eager" />
        ) : (
          <div className="blumat-hero-placeholder" aria-hidden="true"><span>Blumat</span></div>
        )}
      </section>

      <section className="blumat-path" aria-labelledby="blumat-path-heading-en">
        <p className="page-eyebrow">Choose by task</p>
        <h2 id="blumat-path-heading-en">Start with the watering problem, not the product.</h2>
        <div className="blumat-steps">
          <article><b>01</b><h3>Single pots</h3><p>Classic and Easy suit smaller setups and individual plants.</p></article>
          <article><b>02</b><h3>Multiple plants</h3><p>Tropf-Blumat forms the basis of an expandable drip-watering system.</p></article>
          <article><b>03</b><h3>Monitor moisture</h3><p>Blumat Digital adds measurable substrate-moisture monitoring.</p></article>
          <article><b>04</b><h3>Expand the system</h3><p>Tubing, connectors, drippers and valves extend an existing setup.</p></article>
        </div>
      </section>

      <section id="blumat-range-en" aria-labelledby="blumat-products-heading-en">
        <p className="page-eyebrow">Current Shopify range</p>
        <h2 id="blumat-products-heading-en">Explore Blumat by task</h2>
        {!products.length ? <p role="status">No Blumat products are currently available.</p> : null}

        {groups.map((group) => {
          const items = products.filter((product) => groupFor(product.title) === group);
          if (!items.length) return null;
          return (
            <section className="blumat-group" key={group}>
              <h3>{group}</h3>
              <div className="blumat-grid">
                {items.map((product) => (
                  <article className="blumat-card" key={product.id}>
                    <Link to={`/en/products/${product.handle}`} prefetch="intent">
                      {product.featuredImage ? (
                        <Image
                          data={product.featuredImage}
                          sizes="(min-width: 1000px) 23vw, (min-width: 650px) 45vw, 100vw"
                        />
                      ) : null}
                      <h4>{product.title}</h4>
                    </Link>
                    {product.shortClaim?.value ? <p>{product.shortClaim.value}</p> : null}
                    <p className="blumat-price">From <Money data={product.priceRange.minVariantPrice} /></p>
                    <Link className="blumat-product-link" to={`/en/products/${product.handle}`} prefetch="intent">
                      View product →
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </section>

      <section className="blumat-advice" aria-labelledby="blumat-advice-heading-en">
        <p className="page-eyebrow">Not sure which system?</p>
        <h2 id="blumat-advice-heading-en">LEAF can first help define the watering problem.</h2>
        <p>
          Describe the number of plants, pot sizes and your normal watering routine. LEAF can
          explain useful paths and content without forcing a product recommendation.
        </p>
      </section>
    </div>
  );
}

const BLUMAT_QUERY = `#graphql
  query EnglishBlumatBrand($country: CountryCode, $language: LanguageCode, $query: String!)
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
