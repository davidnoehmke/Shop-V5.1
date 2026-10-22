import {Image, Money} from '@shopify/hydrogen';
import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/_index';
import {AddToCartButton} from '~/components/AddToCartButton';
import {useAside} from '~/components/Aside';
import type {CurrencyCode} from '@shopify/hydrogen/storefront-api-types';

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
  productType: string;
  shortClaim?: {value: string} | null;
  mixingRatio?: {value: string} | null;
  ingredients?: {value: string} | null;
  featuredImage?: HomepageImage | null;
  selectedOrFirstAvailableVariant?: {
    id: string;
    availableForSale: boolean;
    price: HomepageMoney;
    product: {
      title: string;
      handle: string;
    };
  } | null;
  priceRange: {
    minVariantPrice: HomepageMoney;
  };
};

type HomepageCollection = {
  id: string;
  title: string;
  handle: string;
  description: string;
  image?: HomepageImage | null;
};

type HomepageQuery = {
  shop: {
    name: string;
    description: string | null;
  };
  products: {
    nodes: HomepageProduct[];
  };
  collections: {
    nodes: HomepageCollection[];
  };
};

export const meta: Route.MetaFunction = () => {
  return [
    {title: 'Substrat-Konfigurator, Pflanzen & Zubehör | LEAFerservice'},
    {
      name: 'description',
      content:
        'Pflanze auswählen, passendes Substrat- und Topfset konfigurieren und Pflanzen, Licht sowie Zubehör direkt bei LEAFerservice finden.',
    },
  ];
};

export async function loader({context}: Route.LoaderArgs) {
  const homepage = await context.storefront.query<HomepageQuery>(
    HOMEPAGE_QUERY,
    {
      cache: context.storefront.CacheShort(),
    },
  );

  const products = homepage.products.nodes;
  const collections = homepage.collections.nodes;

  return {
    products,
    collections,
    heroProduct: products[0] ?? null,
    substrateProduct:
      products.find((product) =>
        /substrat|mix|perlite|seramis|lava|blaehton|blähton/i.test(
          `${product.title} ${product.productType}`,
        ),
      ) ?? products[1] ?? null,
    potProduct:
      products.find((product) =>
        /topf|pot|grow|lechuza|stoff/i.test(
          `${product.title} ${product.productType}`,
        ),
      ) ?? products[2] ?? null,
  };
}

export default function Homepage() {
  const {products, collections, heroProduct, substrateProduct, potProduct} =
    useLoaderData<typeof loader>();

  return (
    <div className="leafer-home">
      <Hero product={heroProduct} />
      <ConfiguratorPreview
        products={products}
        substrateProduct={substrateProduct}
        potProduct={potProduct}
      />
      <ProductWorlds collections={collections} />
      <FeaturedProducts products={products} />
      <KnowledgeSection />
    </div>
  );
}

function Hero({product}: {product: HomepageProduct | null}) {
  const image = product?.featuredImage;

  return (
    <section className="leafer-hero">
      <div className="leafer-wrap leafer-hero-grid">
        <div className="leafer-hero-copy">
          <p className="leafer-eyebrow">Pflanzen-Systeme statt Einzelteile</p>
          <h1>Pflanze waehlen. Setup bekommen. Besser wachsen.</h1>
          <p className="leafer-lead">
            LEAFerservice fuehrt Kundinnen und Kunden von der Pflanze zum
            passenden System: Substrat, Topf, Rankhilfe, Licht und smarte
            Add-ons in einem klaren Kaufweg.
          </p>
          <div className="leafer-actions">
            <a className="leafer-button leafer-button-primary" href="#konfigurator">
              Set konfigurieren
            </a>
            <a className="leafer-button leafer-button-ghost" href="#schnell">
              Nur Topf + Substrat
            </a>
          </div>
          <div className="leafer-trust">
            <span>Passend kombiniert</span>
            <span>Klare Anwendung</span>
            <span>Direkt bestellbar</span>
          </div>
        </div>

        <Link
          className="leafer-hero-product"
          to={product ? `/products/${product.handle}` : '/collections/all'}
          prefetch="intent"
        >
          <div className="leafer-hero-image">
            {image ? (
              <Image
                data={image}
                alt={image.altText || product?.title || 'LEAFerservice Produkt'}
                sizes="(min-width: 900px) 48vw, 92vw"
                loading="eager"
              />
            ) : (
              <div className="leafer-image-fallback">LEAFER</div>
            )}
          </div>
          <div className="leafer-hero-card">
            <span>Empfohlen</span>
            <strong>{product?.title ?? 'LEAFerservice Sortiment'}</strong>
            {product ? (
              <Money data={product.priceRange.minVariantPrice} />
            ) : (
              <small>Sortiment entdecken und passend kombinieren.</small>
            )}
          </div>
        </Link>
      </div>
    </section>
  );
}

function ConfiguratorPreview({
  products,
  substrateProduct,
  potProduct,
}: {
  products: HomepageProduct[];
  substrateProduct: HomepageProduct | null;
  potProduct: HomepageProduct | null;
}) {
  return (
    <section className="leafer-section leafer-configurator" id="konfigurator">
      <div className="leafer-wrap">
        <div className="leafer-section-head">
          <p className="leafer-eyebrow">Konfigurator</p>
          <h2>Vom Pflanzenprojekt zum passenden Setup.</h2>
          <p>
            Wähle Pflanzengruppe und Projektgröße. Daraus entsteht ein übersichtlicher
            Weg zu Substrat, Gefäß und passenden Ergänzungen.
          </p>
        </div>

        <div className="leafer-config-grid">
          <div className="leafer-config-panel">
            <label>
              Pflanze
              <select defaultValue="aroid">
                <option value="aroid">Alocasia / Monstera / Philodendron</option>
                <option value="herbs">Kraeuter & Starter-Sets</option>
                <option value="caladium">Caladium & Knollenpflanzen</option>
              </select>
            </label>
            <label>
              Projektgroesse
              <input type="range" min="2" max="25" defaultValue="5" />
            </label>
            <div className="leafer-tabs">
              <details open>
                <summary>Empfohlenes System</summary>
                <p>
                  Strukturstarkes Substrat, passendes Gefäß und Ergänzungen nach
                  tatsächlichem Bedarf.
                </p>
              </details>
              <details>
                <summary>Warum diese Mischung?</summary>
                <p>
                  Luft, Wasserhaltefaehigkeit und Mineralanteil werden nach
                  Pflanzenbeduerfnis kombiniert.
                </p>
              </details>
            </div>
          </div>

          <div className="leafer-bundle">
            <BundleLine label="Substrat" product={substrateProduct} />
            <BundleLine label="Topf" product={potProduct} />
            <BundleLine label="Add-on" product={products[3] ?? null} />
          </div>
        </div>
      </div>
    </section>
  );
}

function BundleLine({
  label,
  product,
}: {
  label: string;
  product: HomepageProduct | null;
}) {
  const variant = product?.selectedOrFirstAvailableVariant;
  const {open} = useAside();

  return (
    <article className="leafer-bundle-line">
      <div>
        <span>{label}</span>
        <strong>{product?.title ?? `${label} auswaehlen`}</strong>
        {product ? <Money data={product.priceRange.minVariantPrice} /> : null}
      </div>
      {variant ? (
        <AddToCartButton
          disabled={!variant.availableForSale}
          lines={[
            {
              merchandiseId: variant.id,
              quantity: 1,
              selectedVariant: variant,
            },
          ]}
          onSuccess={() => open('cart')}
        >
          {variant.availableForSale ? 'Hinzufuegen' : 'Ausverkauft'}
        </AddToCartButton>
      ) : (
        <Link to="/collections/all" prefetch="intent">
          Sortiment
        </Link>
      )}
    </article>
  );
}

function ProductWorlds({collections}: {collections: HomepageCollection[]}) {
  const fallbackWorlds: HomepageCollection[] = [
    {
      id: 'substrate-fallback',
      title: 'Substrate',
      handle: 'substrate',
      description: 'Mischungen und Bestandteile fuer stabile Wurzeln.',
    },
    {
      id: 'pots-fallback',
      title: 'LEAFerPots',
      handle: 'toepfe',
      description: 'Luftige Toepfe, Selbstbewaesserung und saubere Drainage.',
    },
    {
      id: 'smart-growing-fallback',
      title: 'Smart Growing',
      handle: 'smart-growing',
      description: 'Licht, Sensorik und Zubehoer fuer kontrolliertes Wachstum.',
    },
  ];
  const worlds = collections.length ? collections.slice(0, 3) : fallbackWorlds;

  return (
    <section className="leafer-section leafer-worlds">
      <div className="leafer-wrap">
        <div className="leafer-section-head">
          <p className="leafer-eyebrow">Produktwelten</p>
          <h2>Weniger suchen. Schneller das richtige Setup finden.</h2>
        </div>
        <div className="leafer-world-grid">
          {worlds.map((world) => (
            <Link
              key={world.handle}
              className="leafer-world-card"
              to={`/collections/${world.handle}`}
              prefetch="intent"
            >
              {'image' in world && world.image ? (
                <Image
                  data={world.image}
                  alt={world.image.altText || world.title}
                  sizes="(min-width: 900px) 30vw, 90vw"
                />
              ) : null}
              <span>Entdecken</span>
              <h3>{world.title}</h3>
              <p>{world.description || 'Kuratierte Auswahl aus Shopify.'}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedProducts({products}: {products: HomepageProduct[]}) {
  return (
    <section className="leafer-section leafer-products" id="schnell">
      <div className="leafer-wrap">
        <div className="leafer-section-head">
          <p className="leafer-eyebrow">Kurzer Weg</p>
          <h2>Direkt Topf, Substrat oder Starter-Set kaufen.</h2>
          <p>
            Fuer kleine Projekte bleibt der Kaufweg bewusst kurz: Produkt
            waehlen, in den Warenkorb legen, fertig.
          </p>
        </div>
        <div className="leafer-product-grid">
          {products.slice(0, 8).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({product}: {product: HomepageProduct}) {
  const variant = product.selectedOrFirstAvailableVariant;
  const {open} = useAside();

  return (
    <article className="leafer-product-card">
      <Link to={`/products/${product.handle}`} prefetch="intent">
        {product.featuredImage ? (
          <Image
            data={product.featuredImage}
            alt={product.featuredImage.altText || product.title}
            aspectRatio="1/1"
            sizes="(min-width: 900px) 22vw, 46vw"
          />
        ) : (
          <div className="leafer-product-fallback">LEAFER</div>
        )}
        <span>{product.vendor || 'LEAFerservice'}</span>
        <h3>{product.title}</h3>
      </Link>
      <div className="leafer-card-bottom">
        <Money data={product.priceRange.minVariantPrice} />
        {variant ? (
          <AddToCartButton
            disabled={!variant.availableForSale}
            lines={[
              {
                merchandiseId: variant.id,
                quantity: 1,
                selectedVariant: variant,
              },
            ]}
            onSuccess={() => open('cart')}
          >
            +
          </AddToCartButton>
        ) : null}
      </div>
    </article>
  );
}

function KnowledgeSection() {
  return (
    <section className="leafer-section leafer-knowledge">
      <div className="leafer-wrap leafer-knowledge-grid">
        <div>
          <p className="leafer-eyebrow">Wissen & Beratung</p>
          <h2>Wissen führt direkt zur passenden Lösung.</h2>
        </div>
        <div className="leafer-knowledge-list">
          <Link to="/blogs/journal/braune-flecken-alocasia" prefetch="intent">
            Braune Flecken an Alocasia verstehen
          </Link>
          <Link to="/collections/all" prefetch="intent">
            Passendes Substrat nach Pflanzengruppe finden
          </Link>
          <Link to="/pages/leafers-konfigurator" prefetch="intent">
            Zum Substrat-Konfigurator
          </Link>
        </div>
      </div>
    </section>
  );
}

const HOMEPAGE_QUERY = `#graphql
  fragment HomepageImage on Image {
    id
    url
    altText
    width
    height
  }

  fragment HomepageMoney on MoneyV2 {
    amount
    currencyCode
  }

  fragment HomepageProduct on Product {
    id
    title
    handle
    vendor
    productType
    shortClaim: metafield(namespace: "leafer", key: "short_claim") {
      value
    }
    mixingRatio: metafield(namespace: "leafer", key: "mixing_ratio") {
      value
    }
    ingredients: metafield(namespace: "leafer", key: "ingredients") {
      value
    }
    featuredImage {
      ...HomepageImage
    }
    selectedOrFirstAvailableVariant {
      id
      availableForSale
      price {
        ...HomepageMoney
      }
      product {
        title
        handle
      }
    }
    priceRange {
      minVariantPrice {
        ...HomepageMoney
      }
    }
  }

  query LeaferHomepage($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    shop {
      name
      description
    }
    products(first: 8, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...HomepageProduct
      }
    }
    collections(first: 6, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        title
        handle
        description
        image {
          ...HomepageImage
        }
      }
    }
  }
` as const;

