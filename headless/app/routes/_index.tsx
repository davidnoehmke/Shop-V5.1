import {useLoaderData} from 'react-router';
import type {Route} from './+types/_index';
import {LeafEntryGateway} from '~/components/LeafEntryGateway';
import type {EntryImage, EntryProduct, EntryStory} from '~/components/LeafEntryGateway';
import entryStyles from '~/styles/entry-gateway.css?url';

type HomepageQuery = {
  collection: {
    id: string; title: string; description: string;
    image?: EntryImage | null;
    products: {nodes: EntryProduct[]};
  } | null;
};
type JournalQuery = {
  blogs: {nodes: Array<{
    handle: string;
    articles: {nodes: Array<Omit<EntryStory, 'blogHandle'>>};
  }>};
};

// Keep the established home URL and metadata. This PR changes the entry UX only.
export const meta: Route.MetaFunction = () => [
  {title: 'Substrate, Pflanzenlicht & Beratung | LEAFerservice'},
  {name: 'description', content: 'LEAFerservice verbindet eigene Substratmischungen, einen Substrat-Konfigurator, Pflanzenlicht, Bew\u00e4sserung und Pflanzenwissen mit dem KI-Assistenten LEAF.'},
];
export const links: Route.LinksFunction = () => [{rel: 'stylesheet', href: entryStyles}];

export async function loader({context}: Route.LoaderArgs) {
  const [homepage, journal] = await Promise.all([
    context.storefront.query<HomepageQuery>(HOMEPAGE_QUERY, {cache: context.storefront.CacheShort()}),
    context.storefront.query<JournalQuery>(ENTRY_JOURNAL_QUERY, {cache: context.storefront.CacheShort()}).catch(() => {
      // A missing content scope must not take the commerce homepage offline.
      console.warn('Entry gateway: journal preview unavailable');
      return null;
    }),
  ]);
  const stories: EntryStory[] = (journal?.blogs.nodes ?? [])
    .filter((blog) => blog.handle !== 'live-labs')
    .flatMap((blog) => blog.articles.nodes.map((article) => ({...article, blogHandle: blog.handle})))
    .slice(0, 3);
  return {
    substrateCollection: homepage.collection,
    stories,
    heroImage: stories.find((story) => story.image)?.image ?? homepage.collection?.image ?? homepage.collection?.products.nodes[0]?.featuredImage ?? null,
  };
}

export default function Homepage() {
  const {substrateCollection, stories, heroImage} = useLoaderData<typeof loader>();
  return <LeafEntryGateway locale="de" heroImage={heroImage} stories={stories} products={substrateCollection?.products.nodes ?? []} />;
}

const HOMEPAGE_QUERY = `#graphql
  query LeafHomepage($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    collection(handle: "substratwelt-pflanzsubstrate-mischungen-zusatze") {
      id title description
      image { id url altText width height }
      products(first: 6) {
        nodes {
          id title handle vendor
          featuredImage { id url altText width height }
          priceRange { minVariantPrice { amount currencyCode } }
        }
      }
    }
  }
` as const;

const ENTRY_JOURNAL_QUERY = `#graphql
  query EntryJournal($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    blogs(first: 6) {
      nodes {
        handle
        articles(first: 1, sortKey: PUBLISHED_AT, reverse: true) {
          nodes {
            id title handle excerpt(truncateAt: 180)
            image { id url altText width height }
          }
        }
      }
    }
  }
` as const;
