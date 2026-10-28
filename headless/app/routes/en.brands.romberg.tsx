import {Link, useLoaderData} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {Route} from './+types/en.brands.romberg';

export const meta: Route.MetaFunction = () => [
  {title: 'Romberg propagation & seed starting | LEAFerservice'},
  {
    name: 'description',
    content:
      'Explore Romberg propagation solutions at LEAFerservice: BoQube propagators, coco coir plugs and heat mats for indoor seed starting.',
  },
  {name: 'robots', content: 'noindex,nofollow'},
];

const PREVIEW_PRODUCTS = [
  {
    id: 'romberg:16294166',
    title: 'Romberg BoQube S propagator',
    image: 'https://cdn.shopify.com/s/files/1/0949/8876/3521/files/romberg-boqube-s.jpg?v=1793171367',
    price: '€7.99',
    claim: 'Compact propagator for up to 8 coir plugs.',
  },
  {
    id: 'romberg:16294165',
    title: 'Romberg BoQube M propagator',
    image: 'https://cdn.shopify.com/s/files/1/0949/8876/3521/files/romberg-boqube-m.jpg?v=1793171374',
    price: '€9.99',
    claim: 'More room for seedlings and cuttings, with up to 18 plug positions.',
  },
  {
    id: 'romberg:10091021',
    title: 'Romberg coco coir plugs – 50 pack',
    image: 'https://cdn.shopify.com/s/files/1/0949/8876/3521/files/romberg-kokos-quelltabletten-50.jpg?v=1793171381',
    price: '€8.49',
    claim: '50 compressed coir plugs for seed starting and cuttings.',
  },
  {
    id: 'romberg:16293121',
    title: 'Romberg heat mat S STYLE 40 × 15 cm 14 W',
    image: 'https://cdn.shopify.com/s/files/1/0949/8876/3521/files/romberg-heizmatte-s-style.jpg?v=1793171388',
    price: '€29.95',
    claim: 'Supplemental warmth for controlled indoor propagation.',
  },
] as const;

export async function loader({context}: Route.LoaderArgs) {
  const result = await context.storefront.query(ROMBERG_QUERY, {
    variables: {query: 'vendor:"Romberg GmbH & Co. KG"'},
    cache: context.storefront.CacheShort(),
  });
  return {products: result.products.nodes};
}

export default function EnglishRombergBrand() {
  const {products} = useLoaderData<typeof loader>();
  const hasLiveProducts = products.length > 0;
  const hero = products.find((product) => product.featuredImage)?.featuredImage;

  return (
    <div className="page-shell romberg-brand">
      <nav aria-label="Breadcrumb"><Link to="/en">Home</Link> / Romberg</nav>
      <section className="romberg-hero" aria-labelledby="romberg-heading-en">
        <div>
          <p className="page-eyebrow">Romberg · propagation & seed starting</p>
          <h1 id="romberg-heading-en">From seed to a stronger young plant.</h1>
          <p>
            BoQube propagators, coir plugs and supplemental warmth create a clear
            propagation system for windowsills and indoor setups.
          </p>
          <a className="romberg-cta" href="#romberg-range-en">Explore Romberg ↓</a>
        </div>
        {hero ? (
          <Image data={hero} sizes="(min-width: 768px) 45vw, 100vw" loading="eager" />
        ) : (
          <img src={PREVIEW_PRODUCTS[0].image} alt="Romberg BoQube S propagator" loading="eager" />
        )}
      </section>

      <section id="romberg-range-en" aria-labelledby="romberg-products-heading-en">
        <p className="page-eyebrow">Starter range</p>
        <h2 id="romberg-products-heading-en">Romberg propagation essentials</h2>
        {!hasLiveProducts ? (
          <p className="romberg-preview-note" role="status">
            Preview: these Romberg products already exist as Shopify drafts. Purchase links
            stay disabled until procurement data and image rights are finalized.
          </p>
        ) : null}
        <div className="romberg-grid">
          {hasLiveProducts
            ? products.map((product) => (
                <article className="romberg-card" key={product.id}>
                  <Link to={`/en/products/${product.handle}`} prefetch="intent">
                    {product.featuredImage ? (
                      <Image data={product.featuredImage} sizes="(min-width: 900px) 25vw, (min-width: 600px) 45vw, 100vw" />
                    ) : null}
                    <h3>{product.title}</h3>
                  </Link>
                  {product.shortClaim?.value ? <p>{product.shortClaim.value}</p> : null}
                  <p className="romberg-price">From <Money data={product.priceRange.minVariantPrice} /></p>
                  <Link className="romberg-product-link" to={`/en/products/${product.handle}`}>View product →</Link>
                </article>
              ))
            : PREVIEW_PRODUCTS.map((product) => (
                <article className="romberg-card" key={product.id}>
                  <img src={product.image} alt={product.title} loading="lazy" />
                  <h3>{product.title}</h3>
                  <p>{product.claim}</p>
                  <p className="romberg-price">{product.price}</p>
                  <span className="romberg-draft-badge">Not published yet</span>
                </article>
              ))}
        </div>
      </section>
    </div>
  );
}

const ROMBERG_QUERY = `#graphql
  query EnglishRombergBrand($country: CountryCode, $language: LanguageCode, $query: String!)
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
