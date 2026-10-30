import {redirect, useLoaderData, useLocation} from 'react-router';
import type {Route} from './+types/collections.$handle';
import {getPaginationVariables, Analytics, Image} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {ProductItem} from '~/components/ProductItem';
import {Breadcrumbs} from '~/components/Breadcrumbs';
import type {ProductItemFragment} from 'storefrontapi.generated';

export const meta: Route.MetaFunction = ({data}) => {
  const title = data?.collection.title ?? 'Kollektion';
  const description = data?.collection.description;

  return [
    {title: `${title} | LEAFerservice`},
    ...(description
      ? [{name: 'description', content: description.slice(0, 155)}]
      : []),
  ];
};

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

async function loadCriticalData({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  const {storefront} = context;
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 12,
  });

  if (!handle) {
    throw redirect('/collections');
  }

  const {collection} = await storefront.query(COLLECTION_QUERY, {
    variables: {handle, ...paginationVariables},
  });

  if (!collection) {
    throw new Response(`Collection ${handle} not found`, {
      status: 404,
    });
  }

  redirectIfHandleIsLocalized(request, {handle, data: collection});

  return {collection};
}

function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function Collection() {
  const {collection} = useLoaderData<typeof loader>();
  const english = useLocation().pathname.startsWith('/en/');
  const heroImage = collection.image ??
    collection.products.nodes.find((product) => product.featuredImage)?.featuredImage ??
    null;
  const shortIntro = collectionIntro(collection.description);

  return (
    <div className="page-shell collection">
      <Breadcrumbs
        items={[
          {label: 'Start', to: '/'},
          {label: 'Sortiment', to: '/collections'},
          {label: collection.title},
        ]}
      />

      <header className="collection-editorial-hero">
        <div className="collection-editorial-hero__copy">
          <p className="page-eyebrow">{english ? 'Product world' : 'Produktwelt'}</p>
          <h1>{collection.title}</h1>
          <p className="collection-editorial-hero__lead">
            {shortIntro || (english
              ? 'Find the right products for your plant project.'
              : 'Entdecke passende Produkte für dein Pflanzenprojekt.')}
          </p>
          <a className="collection-editorial-hero__cta" href="#collection-products-grid">
            {english ? 'Explore products' : 'Produkte entdecken'}
            <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="collection-editorial-hero__visual">
          {heroImage ? (
            <Image
              data={heroImage}
              alt={heroImage.altText || collection.title}
              sizes="(min-width: 1000px) 560px, (min-width: 700px) 45vw, 92vw"
              loading="eager"
            />
          ) : (
            <div className="collection-editorial-hero__placeholder" aria-hidden="true">
              <span>LEAF</span>
            </div>
          )}
        </div>
      </header>

      <section className="collection-products" aria-labelledby="collection-products-heading">
        <div className="section-heading-row">
          <div>
            <p className="page-eyebrow">{english ? 'Selection' : 'Auswahl'}</p>
            <h2 id="collection-products-heading">{english ? 'Products in this world' : 'Produkte in dieser Welt'}</h2>
          </div>
          <a className="text-link" href="#collection-products-grid">
            {english ? 'Jump to selection ↓' : 'Direkt zur Auswahl ↓'}
          </a>
        </div>

        <div id="collection-products-grid">
          <PaginatedResourceSection<ProductItemFragment>
            connection={collection.products}
            resourcesClassName="products-grid"
          >
            {({node: product, index}) => (
              <ProductItem
                key={product.id}
                product={product}
                loading={index < 6 ? 'eager' : undefined}
              />
            )}
          </PaginatedResourceSection>
        </div>
      </section>

      {collection.descriptionHtml ? (
        <section className="collection-editorial-more" aria-label={english ? 'Buying guidance' : 'Weitere Informationen'}>
          <details>
            <summary>{english ? 'More information and advice' : 'Mehr Informationen & Ratgeber'}</summary>
            <div
              className="collection-editorial-more__body rich-text"
              dangerouslySetInnerHTML={{__html: collection.descriptionHtml}}
            />
          </details>
        </section>
      ) : null}

      <Analytics.CollectionView
        data={{
          collection: {
            id: collection.id,
            handle: collection.handle,
          },
        }}
      />
    </div>
  );
}

function collectionIntro(description?: string | null, maxLength = 190): string {
  if (!description) return '';
  const normalized = description.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  const words = normalized.slice(0, maxLength + 1).split(' ');
  words.pop();
  return words.join(' ').trimEnd() + '…';
}

const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment ProductItem on Product {
    id
    handle
    title
    vendor
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
  }
` as const;

const COLLECTION_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}
  query Collection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      descriptionHtml
      image { id url altText width height }
      products(
        first: $first,
        last: $last,
        before: $startCursor,
        after: $endCursor
      ) {
        nodes {
          ...ProductItem
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          endCursor
          startCursor
        }
      }
    }
  }
` as const;

