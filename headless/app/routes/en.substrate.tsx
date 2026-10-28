import {Image, Money} from '@shopify/hydrogen';
import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/en.substrate';

export const meta: Route.MetaFunction = () => [
  {title: 'Substrate world – mixes, components & configurator | LEAFerservice'},
  {
    name: 'description',
    content:
      'Explore ready-made substrate mixes, individual components and the LEAF custom substrate configurator.',
  },
];

export async function loader({context}: Route.LoaderArgs) {
  const data = await context.storefront.query(SUBSTRATE_WORLD_QUERY, {
    cache: context.storefront.CacheShort(),
  });
  return {
    mixes: data.mixes?.products.nodes ?? [],
    components: data.components?.products.nodes ?? [],
    configurator: data.configurator,
  };
}

export default function EnglishSubstrateWorld() {
  const {mixes, components, configurator} = useLoaderData<typeof loader>();
  return (
    <div className="page-shell substrate-world">
      <nav aria-label="Breadcrumb"><Link to="/en">Home</Link> / Substrate</nav>
      <section className="substrate-world__hero">
        <div>
          <p className="page-eyebrow">LEAFerservice · substrate world</p>
          <h1>Three paths to the right root environment.</h1>
          <p>Choose a ready-made mix, build a custom recipe or buy individual components by function.</p>
        </div>
        <div className="substrate-world__paths">
          <a href="#ready-mixes"><b>01</b><span>Ready-made mixes</span></a>
          <a href="#configurator"><b>02</b><span>Custom mix</span></a>
          <a href="#components"><b>03</b><span>Individual components</span></a>
        </div>
      </section>

      <section id="ready-mixes" className="substrate-world__section">
        <p className="page-eyebrow">Ready to use</p><h2>Ready-made substrate mixes</h2>
        <div className="substrate-world__grid">
          {mixes.map((product) => (
            <article key={product.id}>
              <Link to={`/en/products/${product.handle}`}>
                {product.featuredImage ? <Image data={product.featuredImage} sizes="(min-width:900px) 30vw, 90vw" /> : null}
                <h3>{product.title}</h3>
              </Link>
              <p>From <Money data={product.priceRange.minVariantPrice} /></p>
            </article>
          ))}
        </div>
      </section>

      <section id="configurator" className="substrate-world__configurator">
        <div>
          <p className="page-eyebrow">Custom</p>
          <h2>Up to four components. Always 100%.</h2>
          <p>The headless configurator balances the other shares automatically and sends the recipe with the cart line.</p>
          <Link className="substrate-world__cta" to="/en/products/leafer-substrat-konfigurator">Open configurator →</Link>
        </div>
        {configurator?.featuredImage ? <Image data={configurator.featuredImage} sizes="(min-width:900px) 40vw, 100vw" /> : null}
      </section>

      <section id="components" className="substrate-world__section">
        <p className="page-eyebrow">Build it yourself</p><h2>Substrate components</h2>
        <div className="substrate-component-strip">
          {components.map((product) => (
            <Link key={product.id} to={`/en/products/${product.handle}`}>
              {product.featuredImage ? <Image data={product.featuredImage} sizes="120px" /> : null}
              <span>{product.title}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

const SUBSTRATE_WORLD_QUERY = `#graphql
  query EnglishSubstrateWorld($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    mixes: collection(handle: "pflanzsubstrate-mischungen") {
      products(first: 12, sortKey: TITLE) {
        nodes {
          id handle title
          featuredImage { id url altText width height }
          priceRange { minVariantPrice { amount currencyCode } }
        }
      }
    }
    components: collection(handle: "substrate-verbesserer") {
      products(first: 20, sortKey: TITLE) {
        nodes {
          id handle title
          featuredImage { id url altText width height }
          priceRange { minVariantPrice { amount currencyCode } }
        }
      }
    }
    configurator: product(handle: "leafer-substrat-konfigurator") {
      id handle title
      featuredImage { id url altText width height }
    }
  }
` as const;
