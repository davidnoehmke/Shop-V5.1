import {useLoaderData, Link} from 'react-router';
import type {Route} from './+types/collections._index';
import {getPaginationVariables, Image} from '@shopify/hydrogen';
import type {CollectionFragment} from 'storefrontapi.generated';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {Breadcrumbs} from '~/components/Breadcrumbs';

export const meta: Route.MetaFunction = () => {
  return [
    {title: 'Sortiment & Produktwelten | LEAFerservice'},
    {
      name: 'description',
      content:
        'Entdecke Substrate, Pflanzgefäße, Beleuchtung, Pflanzen und Zubehör nach Produktwelt geordnet.',
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
  const {collections} = useLoaderData<typeof loader>();

  return (
    <div className="page-shell collections">
      <Breadcrumbs
        items={[
          {label: 'Start', to: '/'},
          {label: 'Sortiment'},
        ]}
      />

      <header className="page-intro">
        <p className="page-eyebrow">Produktwelten</p>
        <h1>Vom Projekt zur passenden Lösung.</h1>
        <p className="page-lead">
          Starte mit einer Produktwelt und gehe anschließend gezielt tiefer.
          So bleiben Substrate, Gefäße, Pflanzen, Licht und Zubehör auch bei
          wachsendem Sortiment schnell erfassbar.
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
  return (
    <Link
      className="collection-item"
      to={`/collections/${collection.handle}`}
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
        <span className="collection-item-label">Produktwelt</span>
        <h2>{collection.title}</h2>
        {collection.description ? (
          <p>{collection.description}</p>
        ) : (
          <p>Produkte, Empfehlungen und passende Ergänzungen entdecken.</p>
        )}
        <span className="text-link">Entdecken →</span>
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

