import {PlanningEntry} from '~/components/PlanningEntry';
import {redirect, useLoaderData, useLocation} from 'react-router';
import type {Route} from './+types/collections.$handle';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
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
  const locale = useLocation().pathname.startsWith('/en/') ? 'en' : 'de';

  return (
    <div className="page-shell collection">
      <Breadcrumbs
        items={[
          {
            label: locale === 'en' ? 'Home' : 'Start',
            to: locale === 'en' ? '/en' : '/',
          },
          {
            label: locale === 'en' ? 'Shop' : 'Sortiment',
            to: locale === 'en' ? '/en/collections' : '/collections',
          },
          {label: collection.title},
        ]}
      />

      <header className="page-intro collection-intro">
        <div>
          <p className="page-eyebrow">
            {locale === 'en' ? 'Product world' : 'Produktwelt'}
          </p>
          <h1>{collection.title}</h1>
        </div>
        {collection.description ? (
          <p className="page-lead">{collection.description}</p>
        ) : (
          <p className="page-lead">
            {locale === 'en'
              ? 'Discover matching products and combine them into a coherent setup.'
              : 'Entdecke passende Produkte und kombiniere sie zu einem stimmigen Setup.'}
          </p>
        )}
      </header>

      {['interieur-solutions', 'pflanzenbeleuchtung'].includes(
        collection.handle,
      ) && <PlanningEntry locale={locale} />}

      <div className="section-divider" aria-hidden="true" />

      <section
        className="collection-products"
        aria-labelledby="collection-products-heading"
      >
        <div className="section-heading-row">
          <div>
            <p className="page-eyebrow">
              {locale === 'en' ? 'Selection' : 'Auswahl'}
            </p>
            <h2 id="collection-products-heading">
              {locale === 'en'
                ? 'Products in this world'
                : 'Produkte in dieser Welt'}
            </h2>
          </div>
          <a className="text-link" href="#collection-products-grid">
            {locale === 'en' ? 'Go to products ↓' : 'Direkt zur Auswahl ↓'}
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
