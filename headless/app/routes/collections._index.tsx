import {useLoaderData, useLocation, Link} from 'react-router';
import {localizedPath} from '~/lib/locale-path';
import type {Route} from './+types/collections._index';
import {getPaginationVariables, Image} from '@shopify/hydrogen';
import type {CollectionFragment} from 'storefrontapi.generated';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {Breadcrumbs} from '~/components/Breadcrumbs';

export const meta: Route.MetaFunction = ({location}) => {
  const isEnglish = location.pathname === '/en' || location.pathname.startsWith('/en/');
  return [
    {title: isEnglish ? 'Shop & product worlds | LEAFerservice' : 'Sortiment & Produktwelten | LEAFerservice'},
    {
      name: 'description',
      content: isEnglish
        ? 'Discover substrates, planters, lighting, plants and accessories by product world.'
        : 'Entdecke Substrate, Pflanzgefäße, Beleuchtung, Pflanzen und Zubehör nach Produktwelt geordnet.',
    },
  ];
};

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

async function loadCriticalData({context, request}: Route.LoaderArgs) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 8,
  });

  const {collections} = await context.storefront.query(COLLECTIONS_QUERY, {
    variables: paginationVariables,
  });

  return {collections};
}

function loadDeferredData({context}: Route.LoaderArgs) {
  return {};
}

export default function Collections() {
  const {pathname} = useLocation();
  const isEnglish = pathname === '/en' || pathname.startsWith('/en/');
  const {collections} = useLoaderData<typeof loader>();

  return (
    <div className="page-shell collections">
      <Breadcrumbs
        items={[
          {label: isEnglish ? 'Home' : 'Start', to: isEnglish ? '/en' : '/'},
          {label: isEnglish ? 'Shop' : 'Sortiment'},
        ]}
      />

      <header className="page-intro">
        <p className="page-eyebrow">{isEnglish ? 'Product worlds' : 'Produktwelten'}</p>
        <h1>{isEnglish ? 'From your project to the right solution.' : 'Vom Projekt zur passenden Lösung.'}</h1>
        <p className="page-lead">
          {isEnglish
            ? 'Start with a product world, then explore the details. Find substrates, planters, plants, lighting and accessories as the range grows.'
            : 'Starte mit einer Produktwelt und gehe anschließend gezielt tiefer. So bleiben Substrate, Gefäße, Pflanzen, Licht und Zubehör auch bei wachsendem Sortiment schnell erfassbar.'}
        </p>
      </header>

      <PaginatedResourceSection<CollectionFragment>
        connection={collections}
        resourcesClassName="collections-grid"
      >
        {({node: collection, index}) => (
          <CollectionItem
            key={collection.id}
            collection={collection}
            index={index}
          />
        )}
      </PaginatedResourceSection>
    </div>
  );
}

function CollectionItem({
  collection,
  index,
}: {
  collection: CollectionFragment;
  index: number;
}) {
  const {pathname} = useLocation();
  const isEnglish = pathname === '/en' || pathname.startsWith('/en/');
  return (
    <Link
      className="collection-item"
      to={localizedPath(`/collections/${collection.handle}`, pathname)}
      prefetch="intent"
    >
      {collection.image ? (
        <div className="collection-item-media">
          <Image
            alt={collection.image.altText || collection.title}
            aspectRatio="4/3"
            data={collection.image}
            loading={index < 3 ? 'eager' : undefined}
            sizes="(min-width: 70em) 360px, (min-width: 45em) 45vw, 92vw"
          />
        </div>
      ) : (
        <div className="collection-item-media collection-item-fallback" aria-hidden="true">
          LEAFER
        </div>
      )}

      <div className="collection-item-copy">
        <span className="collection-item-label">{isEnglish ? 'Product world' : 'Produktwelt'}</span>
        <h2>{collection.title}</h2>
        {collection.description ? (
          <p>{collection.description}</p>
        ) : (
          <p>{isEnglish ? 'Discover products, recommendations and matching accessories.' : 'Produkte, Empfehlungen und passende Ergänzungen entdecken.'}</p>
        )}
        <span className="text-link">{isEnglish ? 'Explore' : 'Entdecken'} →</span>
      </div>
    </Link>
  );
}

const COLLECTIONS_QUERY = `#graphql
  fragment Collection on Collection {
    id
    title
    handle
    description
    image {
      id
      url
      altText
      width
      height
    }
  }
  query StoreCollections(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    collections(
      first: $first,
      last: $last,
      before: $startCursor,
      after: $endCursor
    ) {
      nodes {
        ...Collection
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
` as const;

