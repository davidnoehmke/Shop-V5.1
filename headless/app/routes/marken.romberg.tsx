import {useLoaderData} from 'react-router';
import type {Route} from './+types/marken.romberg';
import {RombergWorld} from '~/components/RombergWorld';

export const meta: Route.MetaFunction = () => [
  {title: 'Romberg Anzucht & Pflanzenvermehrung | LEAFerservice'},
  {
    name: 'description',
    content:
      'Romberg Anzucht bei LEAFerservice: BoQube Zimmergewächshäuser, Anzuchthäuser, Kokos-Quelltabletten und Heizmatten mit aktuellen Preisen entdecken.',
  },
];

export async function loader({context}: Route.LoaderArgs) {
  const result = await context.storefront.query(ROMBERG_QUERY, {
    variables: {query: 'vendor:"Romberg GmbH & Co. KG"'},
    cache: context.storefront.CacheShort(),
  });
  return {products: result.products.nodes};
}

export default function RombergBrand() {
  const {products} = useLoaderData<typeof loader>();
  return <RombergWorld products={products} locale="de" />;
}

const ROMBERG_QUERY = `#graphql
  query RombergBrand($country: CountryCode, $language: LanguageCode, $query: String!)
  @inContext(country: $country, language: $language) {
    products(first: 100, query: $query, sortKey: TITLE) {
      nodes {
        id
        handle
        title
        description
        productType
        availableForSale
        shortClaim: metafield(namespace: "leafer", key: "short_claim") { value }
        featuredImage { id url altText width height }
        priceRange { minVariantPrice { amount currencyCode } }
      }
    }
  }
` as const;
