import {useLoaderData} from 'react-router';
import type {Route} from './+types/en.products.leafer-substrat-konfigurator';
import {SubstrateConfigurator} from '~/components/SubstrateConfigurator';

export const meta: Route.MetaFunction = () => [
  {title: 'Substrate configurator | LEAFerservice'},
  {
    name: 'description',
    content:
      'Build a custom plant substrate with up to four components. LEAF automatically keeps the mix balanced at 100 percent.',
  },
  {name: 'robots', content: 'noindex,nofollow'},
];

export async function loader({context}: Route.LoaderArgs) {
  const data = await context.storefront.query(SUBSTRATE_CONFIGURATOR_QUERY, {
    cache: context.storefront.CacheShort(),
  });
  if (!data.product?.id) throw new Response('Substrate configurator not found', {status: 404});
  return {
    product: data.product,
    components: data.components?.products.nodes ?? [],
  };
}

export default function EnglishSubstrateConfiguratorRoute() {
  const {product, components} = useLoaderData<typeof loader>();
  return (
    <div className="page-shell substrate-configurator-page">
      <SubstrateConfigurator product={product} components={components} locale="en" />
    </div>
  );
}

const SUBSTRATE_CONFIGURATOR_QUERY = `#graphql
  query EnglishSubstrateConfigurator($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    product(handle: "leafer-substrat-konfigurator") {
      id
      title
      handle
      descriptionHtml
      featuredImage { id url altText width height }
      variants(first: 50) {
        nodes {
          id
          title
          availableForSale
          price { amount currencyCode }
          selectedOptions { name value }
        }
      }
    }
    components: collection(handle: "substrate-verbesserer") {
      products(first: 50, sortKey: TITLE) {
        nodes {
          id
          handle
          title
          featuredImage { id url altText width height }
          priceRange { minVariantPrice { amount currencyCode } }
        }
      }
    }
  }
` as const;
