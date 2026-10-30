import {Image, Money} from '@shopify/hydrogen';
import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/collections.substratwelt-pflanzsubstrate-mischungen-zusatze';

export const meta: Route.MetaFunction = () => [
  {title: 'Substratwelt – Mischungen, Bestandteile & Konfigurator | LEAFerservice'},
  {
    name: 'description',
    content:
      'Die LEAFerservice Substratwelt: fertige Mischungen, einzelne Substratbestandteile und der individuelle Substrat-Konfigurator.',
  },
  {name: 'robots', content: 'noindex,nofollow'},
];

export async function loader({context}: Route.LoaderArgs) {
  const data = await context.storefront.query(SUBSTRATE_WORLD_QUERY, {
    cache: context.storefront.CacheShort(),
  });
  return {
    mixes: data.mixes?.products.nodes ?? [],
    components: data.components?.products.nodes ?? [],
    configurator: data.configurator,
  };
}

export default function SubstrateWorld() {
  const {mixes, components, configurator} = useLoaderData<typeof loader>();
  return (
    <div className="page-shell substrate-world">
      <nav aria-label="Brotkrümelnavigation"><Link to="/">Startseite</Link> / Substratwelt</nav>

      <section className="substrate-world__hero">
        <div>
          <p className="page-eyebrow">LEAFerservice · Substratwelt</p>
          <h1>Drei Wege zum passenden Wurzelraum.</h1>
          <p>
            Nimm eine fertige Mischung, stelle dein Substrat individuell zusammen oder kaufe
            einzelne Bestandteile gezielt nach Funktion.
          </p>
        </div>
        <div className="substrate-world__paths">
          <a href="#fertige-mischungen"><b>01</b><span>Fertige Mischungen</span></a>
          <a href="#konfigurator"><b>02</b><span>Individuell mischen</span></a>
          <a href="#bestandteile"><b>03</b><span>Bestandteile einzeln</span></a>
        </div>
      </section>

      <section id="fertige-mischungen" className="substrate-world__section">
        <p className="page-eyebrow">Direkt einsetzbar</p>
        <h2>Fertige Substratmischungen</h2>
        <p>Für bekannte Pflanzenprofile, wenn du nicht selbst mischen möchtest.</p>
        <div className="substrate-world__grid">
          {mixes.map((product) => (
            <article key={product.id}>
              <Link to={`/products/${product.handle}`}>
                {product.featuredImage ? <Image data={product.featuredImage} sizes="(min-width:900px) 30vw, 90vw" /> : null}
                <h3>{product.title}</h3>
              </Link>
              <p>Ab <Money data={product.priceRange.minVariantPrice} /></p>
            </article>
          ))}
        </div>
        <Link className="text-link" to="/collections/pflanzsubstrate-mischungen">Alle fertigen Mischungen →</Link>
      </section>

      <section id="konfigurator" className="substrate-world__configurator">
        <div>
          <p className="page-eyebrow">Individuell</p>
          <h2>Bis zu vier Bestandteile. Immer 100 %.</h2>
          <p>
            Der Headless-Konfigurator gleicht die Anteile automatisch aus und übergibt deine
            Rezeptur direkt an die Warenkorbposition.
          </p>
          <Link className="substrate-world__cta" to="/products/leafer-substrat-konfigurator">
            Konfigurator öffnen →
          </Link>
        </div>
        {configurator?.featuredImage ? <Image data={configurator.featuredImage} sizes="(min-width:900px) 40vw, 100vw" /> : null}
      </section>

      <section id="bestandteile" className="substrate-world__section">
        <p className="page-eyebrow">Selbst aufbauen</p>
        <h2>Substratbestandteile & Zusätze</h2>
        <p>Einzelkomponenten für Drainage, Luftführung, Struktur und Feuchtepuffer.</p>
        <div className="substrate-component-strip">
          {components.map((product) => (
            <Link key={product.id} to={`/products/${product.handle}`}>
              {product.featuredImage ? <Image data={product.featuredImage} sizes="120px" /> : null}
              <span>{product.title}</span>
            </Link>
          ))}
        </div>
        <Link className="text-link" to="/collections/substrate-verbesserer">Alle Bestandteile →</Link>
      </section>
    </div>
  );
}

const SUBSTRATE_WORLD_QUERY = `#graphql
  query SubstrateWorld($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    mixes: collection(handle: "pflanzsubstrate-mischungen") {
      products(first: 12, sortKey: TITLE) {
        nodes {
          id handle title
          featuredImage { id url altText width height }
          priceRange { minVariantPrice { amount currencyCode } }
        }
      }
    }
    components: collection(handle: "substrate-verbesserer") {
      products(first: 20, sortKey: TITLE) {
        nodes {
          id handle title
          featuredImage { id url altText width height }
          priceRange { minVariantPrice { amount currencyCode } }
        }
      }
    }
    configurator: product(handle: "leafer-substrat-konfigurator") {
      id handle title
      featuredImage { id url altText width height }
    }
  }
` as const;
