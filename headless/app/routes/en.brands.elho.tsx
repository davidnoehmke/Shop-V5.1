import {Link, useLoaderData} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {Route} from './+types/en.brands.elho';

export const meta: Route.MetaFunction = () => [
  {title: 'elho planters & watering | LEAFerservice'},
  {
    name: 'description',
    content:
      'Explore elho planters and watering solutions at LEAFerservice, compare sizes and find a setup that fits your houseplants.',
  },
];

export async function loader({context}: Route.LoaderArgs) {
  const result = await context.storefront.query(ELHO_QUERY, {
    variables: {query: 'vendor:"elho"'},
    cache: context.storefront.CacheShort(),
  });

  return {products: result.products.nodes};
}

export default function EnglishElhoBrand() {
  const {products} = useLoaderData<typeof loader>();
  const hero = products.find((product) => product.featuredImage)?.featuredImage;

  return (
    <div className="page-shell elho-brand">
      <nav aria-label="Breadcrumb">
        <Link to="/en">Home</Link> / elho
      </nav>

      <section className="elho-hero" aria-labelledby="elho-heading-en">
        <div>
          <p className="page-eyebrow">elho · planters & watering</p>
          <h1 id="elho-heading-en">Planter and watering as part of the plant setup.</h1>
          <p>
            Compare sizes and watering approaches for your plant space. LEAF can help you
            navigate and understand the options without turning every question into a sales pitch.
          </p>
          <a className="elho-cta" href="#elho-range-en">Explore elho ↓</a>
        </div>
        {hero ? (
          <Image data={hero} sizes="(min-width: 768px) 45vw, 100vw" loading="eager" />
        ) : (
          <div className="elho-hero-placeholder" aria-hidden="true">
            <span>elho</span>
          </div>
        )}
      </section>

      <section className="elho-path" aria-labelledby="elho-path-heading-en">
        <p className="page-eyebrow">Find a better fit</p>
        <h2 id="elho-path-heading-en">Look beyond appearance alone.</h2>
        <div className="elho-steps">
          <article><b>01</b><h3>Pot size</h3><p>Match the container to the root ball and expected plant growth.</p></article>
          <article><b>02</b><h3>Location</h3><p>Indoor conditions, window placement and watering habits affect the right choice.</p></article>
          <article><b>03</b><h3>Watering</h3><p>Reservoir and insert systems can help make watering more consistent.</p></article>
          <article><b>04</b><h3>System</h3><p>Container, substrate and watering behaviour work best when considered together.</p></article>
        </div>
      </section>

      <section id="elho-range-en" aria-labelledby="elho-products-heading-en">
        <p className="page-eyebrow">Available now</p>
        <h2 id="elho-products-heading-en">elho at LEAFerservice</h2>
        {!products.length ? (
          <p className="elho-preview-note" role="status">
            No elho product is currently available in the headless range.
          </p>
        ) : null}

        <div className="elho-grid">
          {products.map((product) => (
            <article className="elho-card" key={product.id}>
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
              <p className="elho-price">From <Money data={product.priceRange.minVariantPrice} /></p>
              <Link className="elho-product-link" to={`/en/products/${product.handle}`} prefetch="intent">
                View product & sizes →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="elho-advice" aria-labelledby="elho-advice-heading-en">
        <p className="page-eyebrow">Ask LEAF</p>
        <h2 id="elho-advice-heading-en">Unsure about size or watering?</h2>
        <p>
          Ask LEAF for direction or to open a relevant guide. The assistant can explain the
          options without recommending a product unless that is actually useful.
        </p>
      </section>
    </div>
  );
}

const ELHO_QUERY = `#graphql
  query EnglishElhoBrand($country: CountryCode, $language: LanguageCode, $query: String!)
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
