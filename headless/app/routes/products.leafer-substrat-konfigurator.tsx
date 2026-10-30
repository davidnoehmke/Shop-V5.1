import {useLoaderData} from 'react-router';
import type {Route} from './+types/products.leafer-substrat-konfigurator';
import {SubstrateConfigurator} from '~/components/SubstrateConfigurator';

export const meta: Route.MetaFunction = () => [
  {title: 'Substrat-Konfigurator | LEAFerservice'},
  {
    name: 'description',
    content:
      'Individuelles Pflanzsubstrat aus bis zu vier Bestandteilen zusammenstellen. LEAF hält die Mischung automatisch bei 100 Prozent.',
  },
  {name: 'robots', content: 'noindex,nofollow'},
];

export async function loader({context}: Route.LoaderArgs) {
  const data = await context.storefront.query(SUBSTRATE_CONFIGURATOR_QUERY, {
    cache: context.storefront.CacheShort(),
  });
  if (!data.product?.id) throw new Response('Substrat-Konfigurator nicht gefunden', {status: 404});
  return {
    product: data.product,
    components: data.components?.products.nodes ?? [],
  };
}

export default function SubstrateConfiguratorRoute() {
  const {product, components} = useLoaderData<typeof loader>();
  return (
    <div className="page-shell substrate-configurator-page">
      <SubstrateConfigurator product={product} components={components} locale="de" />
    </div>
  );
}

const SUBSTRATE_CONFIGURATOR_QUERY = `#graphql
  query SubstrateConfigurator($country: CountryCode, $language: LanguageCode)
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
