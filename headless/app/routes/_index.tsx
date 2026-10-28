import {Image, Money} from '@shopify/hydrogen';
import {Link, useLoaderData} from 'react-router';
import type {CurrencyCode} from '@shopify/hydrogen/storefront-api-types';
import type {Route} from './+types/_index';
import {LeafAtrium} from '~/components/LeafAtrium';

type HomepageImage = {
  id: string;
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
};

type HomepageMoney = {
  amount: string;
  currencyCode: CurrencyCode;
};

type HomepageProduct = {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  featuredImage?: HomepageImage | null;
  priceRange: {minVariantPrice: HomepageMoney};
};

type HomepageQuery = {
  products: {nodes: HomepageProduct[]};
};

export const meta: Route.MetaFunction = () => [
  {title: 'LEAF Campus – Pflanzenwelten statt Produktregal | LEAFerservice'},
  {
    name: 'description',
    content:
      'LEAFerservice führt über Substrat, Licht, Bewässerung, Gefäße, Anzucht und Wissen in kuratierte Themen- und Markenwelten.',
  },
];

export async function loader({context}: Route.LoaderArgs) {
  const homepage = await context.storefront.query<HomepageQuery>(HOMEPAGE_QUERY, {
    cache: context.storefront.CacheShort(),
  });
  return {products: homepage.products.nodes};
}

export default function Homepage() {
  const {products} = useLoaderData<typeof loader>();

  return (
    <main className="leafer-home">
      <LeafAtrium locale="de" />

      <section className="leaf-campus-shortcut" aria-labelledby="leaf-shortcut-title">
        <div>
          <p className="page-eyebrow">Direkter Weg</p>
          <h2 id="leaf-shortcut-title">Du weißt schon, was du brauchst?</h2>
          <p>
            Das Erlebnis bleibt optional. Wer direkt kaufen möchte, kommt ohne Umweg zu
            Sortiment, Suche und Produkten.
          </p>
        </div>
        <div className="leaf-campus-shortcut__links">
          <Link to="/collections/all" prefetch="intent">Gesamtes Sortiment →</Link>
          <Link to="/search" prefetch="intent">Produkte suchen →</Link>
          <Link to="/products/leafer-substrat-konfigurator" prefetch="intent">
            Substrat konfigurieren →
          </Link>
        </div>
      </section>

      {products.length ? (
        <section className="leaf-campus-featured" aria-labelledby="leaf-featured-title">
          <div className="leaf-campus-featured__head">
            <p className="page-eyebrow">Aktuell im Campus</p>
            <h2 id="leaf-featured-title">Ausgewählte Produkte</h2>
          </div>
          <div className="leaf-campus-featured__grid">
            {products.map((product) => (
              <article key={product.id}>
                <Link to={`/products/${product.handle}`} prefetch="intent">
                  {product.featuredImage ? (
                    <Image
                      data={product.featuredImage}
                      sizes="(min-width: 1000px) 22vw, (min-width: 600px) 45vw, 100vw"
                    />
                  ) : null}
                  <span>{product.vendor || 'LEAFerservice'}</span>
                  <h3>{product.title}</h3>
                </Link>
                <Money data={product.priceRange.minVariantPrice} />
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

const HOMEPAGE_QUERY = `#graphql
  query LeafCampusHomepage($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    products(first: 8, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        title
        handle
        vendor
        featuredImage { id url altText width height }
        priceRange { minVariantPrice { amount currencyCode } }
      }
    }
  }
` as const;
