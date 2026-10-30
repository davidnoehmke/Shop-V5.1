/**
 * Commerce follows the article and uses approved, existing Shopify handles.
 * Storefront visibility and availableForSale are checked at request time.
 */
export type CommerceTopic = 'light' | 'water' | 'substrate' | 'propagation' | 'containers' | 'plants';

const PICKS: Record<CommerceTopic, readonly [string, string, string]> = {
  light: [
    'sansi-br30-24w-led-pflanzenlampe-e27-vollspektrum',
    'neusius-60cm-led-pflanzenlampe-8w-t8-mit-fassung',
    'goleaf-par38-e27-vollspektrum-pflanzenlampe-10w',
  ],
  water: [
    'blumat-classic-automatische-pflanzenbewasserung-3er-set',
    'blumat-easy-flaschenadapter-fur-pflanzenbewasserung-3er-set',
    'leafer-pot',
  ],
  substrate: [
    'leafer-substrat-konfigurator',
    'leafer-alocasia-mix',
    'leaferperlite-premium-perlite',
  ],
  propagation: [
    'anzuchtset-saatgut-zubehoer',
    'leafer-seed-cutting-mix',
    'anzuchtbox-mit-deckel-fur-aussaat-stecklinge',
  ],
  containers: [
    'leafer-pot',
    'runder-steintopf-matt-taupe',
    'zylindrischer-pflanztopf-farbig-matt',
  ],
  plants: [
    'leafer-alocasia-mix',
    'leafer-substrat-konfigurator',
    'sansi-br30-24w-led-pflanzenlampe-e27-vollspektrum',
  ],
};

export function articleCommerceTopic(blogHandle: string, articleHandle: string): CommerceTopic | null {
  if (blogHandle === 'live-labs') return null;
  const handle = articleHandle.toLocaleLowerCase('de');
  if (/pflanzenlampe|beleuchtung|pflanzenlicht|licht-planen|grow-light|soltech|ppfd|ppf-|e27|t8/.test(handle)) return 'light';
  if (/blumat|bewaesser|wasser|staunaesse|giess/.test(handle)) return 'water';
  if (/substrat|pinien|perlit|bims|lava|zeolith|wurmhumus|pflanzenkohle/.test(handle)) return 'substrate';
  if (/anzucht|aussaat|keim|saatgut|obstanbau|obstzucht/.test(handle)) return 'propagation';
  if (/topf|gefaess|interieur|pflanzenwelt|begruenung/.test(handle)) return 'containers';
  if (/monstera|alocasia|pflanzenpflege|zimmerpflanzen/.test(handle)) return 'plants';
  return null;
}

export function articleCommerceHandles(
  blogHandle: string,
  articleHandle: string,
): readonly [string, string, string] | null {
  const topic = articleCommerceTopic(blogHandle, articleHandle);
  return topic ? PICKS[topic] : null;
}

export const BLOG_COMMERCE_QUERY = `#graphql
  query BlogCommerce(
    $one: String!
    $two: String!
    $three: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    one: product(handle: $one) { ...BlogCommerceProduct }
    two: product(handle: $two) { ...BlogCommerceProduct }
    three: product(handle: $three) { ...BlogCommerceProduct }
  }
  fragment BlogCommerceProduct on Product {
    id
    title
    handle
    vendor
    availableForSale
    featuredImage { id url altText width height }
    priceRange { minVariantPrice { amount currencyCode } }
  }
` as const;
