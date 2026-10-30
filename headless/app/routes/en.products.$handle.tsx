import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/en.products.$handle';
import {
  Analytics,
  getAdjacentAndFirstAvailableVariants,
  getProductOptions,
  getSelectedProductOptions,
  Image,
  useOptimisticVariant,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductImage} from '~/components/ProductImage';
import {ProductForm} from '~/components/ProductForm';
import {RombergProductGuide, RombergProductSpecifications} from '~/components/RombergProductGuide';
import {rombergSummary, relatedRombergProducts} from '~/lib/romberg-world';
import type {RombergProduct} from '~/components/RombergWorld';
import {variantGid} from '~/lib/pilot-guards';

const SUNLITE_XL_HANDLE = 'venso-sunlite-xl-25w-led-pflanzenlampe';
const VENSO_SOURCE =
  'https://venso-ecosolutions.de/products/sunlite-xl-25-watt-led-pflanzenlampe-von-venso';
const RHS_SOURCE =
  'https://www.rhs.org.uk/plants/types/houseplants/artificial-lighting';

const TOPIC_TERMS = [
  'plant-lighting',
  'grow-light',
  'grow-lights',
  'pflanzenlicht',
  'pflanzenbeleuchtung',
  'monstera',
  'houseplants',
  'zimmerpflanzen',
  'winter',
  'supplemental-light',
];

export const meta: Route.MetaFunction = ({data}) => {
  const product = data?.product;
  const title =
    product?.handle === SUNLITE_XL_HANDLE
      ? '25W grow light for large houseplants | Venso SUNLiTE XL'
      : `${product?.seo?.title || product?.title || 'Product'} | LEAFerservice`;
  const description =
    product?.handle === SUNLITE_XL_HANDLE
      ? 'Venso SUNLiTE XL 25W grow light for large houseplants: telescopic pot-mounted design, full-spectrum technical data, winter-light guidance and related plant-lighting advice.'
      : product?.seo?.description || product?.description;

  return [
    {title},
    ...(description
      ? [{name: 'description', content: description.slice(0, 155)}]
      : []),
    {
      rel: 'canonical',
      href: `/en/products/${product?.handle ?? ''}`,
    },
  ];
};

export async function loader(args: Route.LoaderArgs) {
  const {context, params, request} = args;
  const handle = params.handle;
  if (!handle) throw new Response('Product not found', {status: 404});

  let selectedOptions = getSelectedProductOptions(request);
  const variantId = variantGid(new URL(request.url).searchParams.get('variant'));

  if (variantId) {
    const {node} = await context.storefront.query(PILOT_VARIANT_QUERY, {
      variables: {id: variantId},
    });
    if (!node || !('selectedOptions' in node) || node.product.handle !== handle) {
      throw new Response('Variant not found', {status: 404});
    }
    selectedOptions = node.selectedOptions;
  }

  const [{product}, articleResult] = await Promise.all([
    context.storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions},
    }),
    context.storefront.query(RELATED_ARTICLES_QUERY, {
      variables: {first: 50},
      cache: context.storefront.CacheShort(),
    }),
  ]);

  if (!product?.id) throw new Response(null, {status: 404});

  const relatedArticles = rankArticles(
    articleResult.articles.nodes,
    product.tags ?? [],
  ).slice(0, 3);

  let rombergRelated: RombergProduct[] = [];
  if (product.vendor === 'Romberg GmbH & Co. KG') {
    try {
      const result = await context.storefront.query(ENGLISH_ROMBERG_RELATED_QUERY, {
        variables: {query: 'vendor:"Romberg GmbH & Co. KG"'},
        cache: context.storefront.CacheShort(),
      });
      rombergRelated = relatedRombergProducts(result.products.nodes, product);
    } catch {
      rombergRelated = [];
    }
  }

  return {product, relatedArticles, rombergRelated};
}

function rankArticles(
  articles: Array<{
    id: string;
    handle: string;
    title: string;
    tags: string[];
    excerpt?: string | null;
    blog: {handle: string};
    image?: {
      id?: string | null;
      url: string;
      altText?: string | null;
      width?: number | null;
      height?: number | null;
    } | null;
  }>,
  productTags: string[],
) {
  const productTerms = new Set(
    [...TOPIC_TERMS, ...productTags].map((value) => value.toLowerCase()),
  );

  return articles
    .filter((article) => {
      const languageTags = article.tags.map((tag) => tag.toLowerCase());
      return (
        languageTags.includes('lang:en') ||
        languageTags.includes('language:en') ||
        languageTags.includes('english')
      );
    })
    .map((article) => {
      const tags = article.tags.map((tag) => tag.toLowerCase());
      const title = article.title.toLowerCase();
      let score = 0;

      for (const term of productTerms) {
        if (tags.includes(term)) score += 10;
        if (title.includes(term.replaceAll('-', ' '))) score += 3;
      }

      return {article, score};
    })
    .filter(({score}) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({article}) => article);
}

export default function EnglishProduct() {
  const {product, relatedArticles, rombergRelated} = useLoaderData<typeof loader>();
  const isRomberg = product.vendor === 'Romberg GmbH & Co. KG';
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const isSunliteXL = product.handle === SUNLITE_XL_HANDLE;
  const displayTitle = isSunliteXL
    ? 'Venso SUNLiTE XL 25W LED grow light'
    : product.title;

  const jsonLd = isSunliteXL
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: displayTitle,
        brand: {'@type': 'Brand', name: 'Venso'},
        sku: selectedVariant?.sku || undefined,
        image: selectedVariant?.image?.url
          ? [selectedVariant.image.url]
          : undefined,
        offers: selectedVariant
          ? {
              '@type': 'Offer',
              price: selectedVariant.price.amount,
              priceCurrency: selectedVariant.price.currencyCode,
              availability: selectedVariant.availableForSale
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
              url: `/en/products/${product.handle}`,
            }
          : undefined,
      }
    : null;

  return (
    <div className="page-shell product-page product-page-en">
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}}
        />
      ) : null}

      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li><Link to="/en">Home</Link></li>
          <li><Link to="/en/collections">Shop</Link></li>
          <li><span aria-current="page">{displayTitle}</span></li>
        </ol>
      </nav>

      <div
        className="product"
        data-product-id={product.id}
        data-variant-id={selectedVariant?.id}
      >
        <div className="product-media-column">
          <ProductImage image={selectedVariant?.image} images={product.images.nodes} title={product.title} locale="en" />
        </div>

        <div className="product-main">
          <p className="page-eyebrow">{[product.vendor, product.productType].filter(Boolean).join(' · ')}</p>
          <h1>{displayTitle}</h1>
          {isRomberg ? (
            <div className="romberg-product-intro">
              <p>{rombergSummary(product.description, 230)}</p>
              <a href="#romberg-guide-heading">Seed-starting tips <span aria-hidden="true">↗</span></a>
              <RombergProductSpecifications product={product} locale="en" />
            </div>
          ) : null}

          {isSunliteXL ? (
            <p className="product-intro-en">
              A 25W pot-mounted grow light designed for large houseplants where
              available daylight is limited. The telescopic support extends up
              to 1.70 m, so the light can be positioned above taller foliage
              without ceiling installation.
            </p>
          ) : null}

          <div className="product-price-block">
            <ProductPrice
              price={selectedVariant?.price}
              compareAtPrice={selectedVariant?.compareAtPrice}
            />
          </div>

          <div className="product-purchase">
            <ProductForm
              productOptions={productOptions}
              selectedVariant={selectedVariant}
              locale="en"
            />
          </div>

          <div className="product-information">
            {isSunliteXL ? (
              <>
                <details open>
                  <summary>Technical overview</summary>
                  <dl className="product-facts">
                    <dt>Power</dt><dd>max. 25W</dd>
                    <dt>Telescopic support</dt><dd>400–1,700 mm</dd>
                    <dt>Beam angle</dt><dd>120°</dd>
                    <dt>PPFD</dt><dd>460 µmol/m²/s at 10 cm</dd>
                    <dt>Spectrum</dt><dd>400–700 nm full spectrum + 640–660 nm red</dd>
                    <dt>Colour rendering</dt><dd>CRI 93, neutral white</dd>
                    <dt>Protection</dt><dd>IP54</dd>
                    <dt>Rated lifetime</dt><dd>&gt;25,000 hours</dd>
                  </dl>
                </details>
                <details>
                  <summary>Why distance matters more than wattage alone</summary>
                  <p className="product-description">
                    The manufacturer specifies 460 µmol/m²/s at a distance of
                    10 cm and a 120° beam angle. That means usable light at the
                    leaf surface changes with mounting distance and plant
                    geometry; “25W” by itself is not enough to determine a
                    suitable setup.
                  </p>
                </details>
              </>
            ) : (
              <details open>
                <summary>Product details</summary>
                <div
                  className="product-description rich-text"
                  dangerouslySetInnerHTML={{__html: product.descriptionHtml}}
                />
              </details>
            )}
          </div>
        </div>
      </div>

      {isSunliteXL ? (
        <>
          <section className="seo-intent-section" aria-labelledby="large-monstera-light">
            <p className="page-eyebrow">Long-tail guide</p>
            <h2 id="large-monstera-light">Grow light for a large Monstera or other tall houseplants</h2>
            <p>
              Large plants can become difficult to position close to a bright
              window. The RHS notes that artificial lighting is useful when
              natural indoor light is insufficient, especially during short
              winter days. The SUNLiTE XL addresses the positioning problem
              with a support that extends to 1.70 m and mounts directly in the
              plant pot.
            </p>
            <p className="source-note">
              Sources: <a href={RHS_SOURCE} rel="noreferrer">RHS guidance on artificial lighting</a>{' '}
              and <a href={VENSO_SOURCE} rel="noreferrer">Venso SUNLiTE XL technical data</a>.
            </p>
          </section>

          <section className="seo-intent-section" aria-labelledby="no-ceiling-grow-light">
            <p className="page-eyebrow">Long-tail guide</p>
            <h2 id="no-ceiling-grow-light">Grow light without ceiling installation</h2>
            <p>
              If drilling, suspension cables or a ceiling fixture are not
              practical, the SUNLiTE XL can be placed in the pot and adjusted
              vertically. That makes it relevant for living rooms, rental
              homes and flexible plant setups where the light should move with
              the plant.
            </p>
            <p className="source-note">
              Mounting method and dimensions are taken from the manufacturer’s
              current product specification.
            </p>
          </section>

          <section className="seo-intent-section" aria-labelledby="winter-grow-light">
            <p className="page-eyebrow">Long-tail guide</p>
            <h2 id="winter-grow-light">25W grow light for large houseplants in winter</h2>
            <p>
              Winter is a common use case for supplemental lighting because
              natural indoor light is reduced by shorter days and room
              placement. Rather than choosing a lamp by wattage alone, position
              it using the plant’s response, distance and measured light
              output. Venso specifies a 120° beam and a PPFD value at 10 cm,
              giving a more useful reference point than power consumption
              alone.
            </p>
            <p className="source-note">
              General winter-light rationale: <a href={RHS_SOURCE} rel="noreferrer">Royal Horticultural Society</a>.
              Product-specific output: <a href={VENSO_SOURCE} rel="noreferrer">Venso EcoSolutions</a>.
            </p>
          </section>

          {relatedArticles.length ? (
            <section className="related-guides" aria-labelledby="related-guides-heading">
              <p className="page-eyebrow">Plant-lighting knowledge</p>
              <h2 id="related-guides-heading">Related guides from LEAFerservice</h2>
              <div className="related-guides-grid">
                {relatedArticles.map((article) => (
                  <article key={article.id}>
                    <Link to={`/en/blogs/${article.blog.handle}/${article.handle}`}>
                      {article.image ? (
                        <Image
                          data={article.image}
                          sizes="(min-width: 900px) 30vw, 100vw"
                        />
                      ) : null}
                      <h3>{article.title}</h3>
                      {article.excerpt ? <p>{article.excerpt}</p> : null}
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {isRomberg ? (
        <RombergProductGuide product={product} locale="en" related={rombergRelated} />
      ) : null}

      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: displayTitle,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </div>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment EnglishProductVariant on ProductVariant {
    availableForSale
    compareAtPrice { amount currencyCode }
    id
    image { __typename id url altText width height }
    price { amount currencyCode }
    product { title handle }
    selectedOptions { name value }
    sku
    title
    unitPrice { amount currencyCode }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment EnglishProduct on Product {
    id
    title
    vendor
    productType
    handle
    tags
    descriptionHtml
    description
    images(first: 10) { nodes { __typename id url altText width height } }
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant { ...EnglishProductVariant }
        swatch { color image { previewImage { url } } }
      }
    }
    selectedOrFirstAvailableVariant(
      selectedOptions: $selectedOptions
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) { ...EnglishProductVariant }
    adjacentVariants(selectedOptions: $selectedOptions) {
      ...EnglishProductVariant
    }
    seo { description title }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query EnglishProduct(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) { ...EnglishProduct }
  }
  ${PRODUCT_FRAGMENT}
` as const;

const PILOT_VARIANT_QUERY = `#graphql
  query EnglishPilotVariant(
    $id: ID!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    node(id: $id) {
      ... on ProductVariant {
        id
        selectedOptions { name value }
        product { handle }
      }
    }
  }
` as const;

const RELATED_ARTICLES_QUERY = `#graphql
  query RelatedPlantLightingArticles(
    $first: Int!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    articles(first: $first, sortKey: PUBLISHED_AT, reverse: true) {
      nodes {
        id
        handle
        title
        tags
        excerpt
        blog { handle }
        image { id url altText width height }
      }
    }
  }
` as const;


const ENGLISH_ROMBERG_RELATED_QUERY = `#graphql
  query EnglishRombergRelatedProducts($country: CountryCode, $language: LanguageCode, $query: String!)
  @inContext(country: $country, language: $language) {
    products(first: 30, query: $query, sortKey: TITLE) {
      nodes {
        id handle title description productType availableForSale
        shortClaim: metafield(namespace: "leafer", key: "short_claim") { value }
        featuredImage { id url altText width height }
        priceRange { minVariantPrice { amount currencyCode } }
      }
    }
  }
` as const;
