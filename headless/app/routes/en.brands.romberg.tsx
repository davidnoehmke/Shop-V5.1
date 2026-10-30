import {useLoaderData} from 'react-router';
import type {Route} from './+types/en.brands.romberg';
import {RombergWorld} from '~/components/RombergWorld';

export const meta: Route.MetaFunction = () => [
  {title: 'Romberg propagators & seed-starting products | LEAFerservice'},
  {
    name: 'description',
    content:
      'Discover Romberg BoQube propagators, seed-starting houses, coco coir plugs and heat mats with current prices at LEAFerservice.',
  },
];

export async function loader({context}: Route.LoaderArgs) {
  const result = await context.storefront.query(ENGLISH_ROMBERG_QUERY, {
    variables: {query: 'vendor:"Romberg GmbH & Co. KG"'},
    cache: context.storefront.CacheShort(),
  });
  return {products: result.products.nodes};
}

export default function EnglishRombergBrand() {
  const {products} = useLoaderData<typeof loader>();
  return <RombergWorld products={products} locale="en" />;
}

const ENGLISH_ROMBERG_QUERY = `#graphql
  query EnglishRombergBrand($country: CountryCode, $language: LanguageCode, $query: String!)
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
