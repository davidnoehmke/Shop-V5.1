import {Link, useLoaderData} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {Route} from './+types/en.brands.venso';

export const meta: Route.MetaFunction = () => [
  {title: 'Venso grow lights for houseplants | LEAFerservice'},
  {
    name: 'description',
    content:
      'Explore Venso grow lights for indoor plants, including pot-mounted, E27 and larger lighting solutions with live prices and variants.',
  },
  {name: 'robots', content: 'noindex,nofollow'},
];

export async function loader({context}: Route.LoaderArgs) {
  const result = await context.storefront.query(VENSO_QUERY, {
    variables: {query: 'vendor:"Venso EcoSolutions GmbH"'},
    cache: context.storefront.CacheShort(),
  });
  return {products: result.products.nodes};
}

export default function EnglishVensoBrand() {
  const {products} = useLoaderData<typeof loader>();
  const hero = products.find((product) => product.featuredImage)?.featuredImage;

  return (
    <div className="page-shell venso-brand">
      <nav aria-label="Breadcrumb">
        <Link to="/en">Home</Link> / Venso
      </nav>

      <section className="venso-hero" aria-labelledby="venso-heading-en">
        <div>
          <p className="page-eyebrow">Venso · grow lighting</p>
          <h1 id="venso-heading-en">Light designed around the plant.</h1>
          <p>
            Compare currently available Venso models, live pricing and product
            formats. Detailed setup guidance and technical context live on the
            individual product pages.
          </p>
          <a className="venso-cta" href="#venso-range-en">
            Explore the Venso range ↓
          </a>
        </div>
        {hero ? (
          <Image
            data={hero}
            sizes="(min-width: 768px) 45vw, 100vw"
            loading="eager"
          />
        ) : null}
      </section>

      <section id="venso-range-en" aria-labelledby="venso-products-heading-en">
        <p className="page-eyebrow">Products</p>
        <h2 id="venso-products-heading-en">Venso grow lights</h2>
        {!products.length ? (
          <p role="status">No Venso products are currently available here.</p>
        ) : null}

        <div className="venso-grid">
          {products.map((product) => (
            <article className="venso-card" key={product.id}>
              <Link to={`/en/products/${product.handle}`} prefetch="intent">
                {product.featuredImage ? (
                  <Image
                    data={product.featuredImage}
                    sizes="(min-width: 900px) 30vw, (min-width: 600px) 45vw, 100vw"
                  />
                ) : null}
                <h3>{product.title}</h3>
              </Link>
              {product.shortClaim?.value ? <p>{product.shortClaim.value}</p> : null}
              <p className="venso-price">
                From <Money data={product.priceRange.minVariantPrice} />
              </p>
              <Link
                className="venso-product-link"
                to={`/en/products/${product.handle}`}
                prefetch="intent"
              >
                View product & variants →
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

const VENSO_QUERY = `#graphql
  query EnglishVensoBrand(
    $country: CountryCode
    $language: LanguageCode
    $query: String!
  ) @inContext(country: $country, language: $language) {
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
