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
  collection: {
    id: string;
    title: string;
    description: string;
    image?: HomepageImage | null;
    products: {nodes: HomepageProduct[]};
  } | null;
};

export const meta: Route.MetaFunction = () => [
  {title: 'Substrate, Pflanzenlicht & Beratung | LEAFerservice'},
  {
    name: 'description',
    content:
      'LEAFerservice verbindet eigene Substratmischungen, einen Substrat-Konfigurator, Pflanzenlicht, Bewässerung und Pflanzenwissen mit dem KI-Assistenten LEAF.',
  },
];

export async function loader({context}: Route.LoaderArgs) {
  const homepage = await context.storefront.query<HomepageQuery>(HOMEPAGE_QUERY, {
    cache: context.storefront.CacheShort(),
  });

  return {
    substrateCollection: homepage.collection,
  };
}

export default function Homepage() {
  const {substrateCollection} = useLoaderData<typeof loader>();
  const substrateProducts = substrateCollection?.products.nodes ?? [];

  function openLeafAssistant() {
    window.dispatchEvent(new Event('leaf:assistant:open'));
  }

  return (
    <main className="leafer-home leaf-homepage">
      <section className="leaf-home-entry" aria-labelledby="leaf-home-title">
        <div className="leaf-home-entry__copy">
          <p className="page-eyebrow">LEAFerservice · Pflanzen besser verstehen</p>
          <h1 id="leaf-home-title">Was braucht deine Pflanze?</h1>
          <p className="leaf-home-entry__lead">
            Starte mit deinem Ziel statt mit einem Produktregal. LEAF hilft dir bei der
            Orientierung – oder du gehst direkt zu Substraten, Konfigurator und unseren
            kuratierten Themenwelten.
          </p>
          <div className="leaf-home-entry__actions">
            <button type="button" className="leaf-home-entry__assistant" onClick={openLeafAssistant}>
              Frag LEAF
            </button>
            <Link to="/products/leafer-substrat-konfigurator" prefetch="intent">
              Substrat konfigurieren
            </Link>
            <a href="#leaf-worlds">Welten entdecken</a>
          </div>
          <p className="leaf-home-entry__trust">
            Ohne Login nutzbar · Shopify-Checkout · Beratung und Einkauf bleiben getrennte Schritte
          </p>
        </div>
        <div className="leaf-home-entry__visual" aria-hidden="true">
          <div className="leaf-home-entry__orb leaf-home-entry__orb--one" />
          <div className="leaf-home-entry__orb leaf-home-entry__orb--two" />
          <div className="leaf-home-entry__leafmark">LEAF</div>
        </div>
      </section>

      <section className="leaf-home-substrate" aria-labelledby="leaf-substrate-title">
        <div className="leaf-home-substrate__intro">
          <p className="page-eyebrow">Kernkompetenz · Substrate</p>
          <h2 id="leaf-substrate-title">Mischen, auswählen oder selbst konfigurieren.</h2>
          <p>
            Unsere Substratwelt steht bewusst vor den Herstellerwelten: fertige LEAFerservice-
            Mischungen, einzelne Komponenten und ein eigener 100-%-Mix führen direkt zum passenden
            Aufbau.
          </p>
        </div>

        <div className="leaf-home-substrate__paths">
          <Link to="/products/leafer-substrat-konfigurator" prefetch="intent" className="leaf-home-path leaf-home-path--primary">
            <span>01 · Konfigurator</span>
            <strong>Eigenen Mix bauen</strong>
            <p>Bis zu vier Komponenten kombinieren, auf 100 % ausbalancieren und direkt in den Warenkorb legen.</p>
            <b>Konfigurator öffnen →</b>
          </Link>
          <Link to="/collections/substratwelt-pflanzsubstrate-mischungen-zusatze" prefetch="intent" className="leaf-home-path">
            <span>02 · Fertigmischungen</span>
            <strong>Bewährte Mischung wählen</strong>
            <p>Für Aroids, Tropical, Orchideen, Bonsai und weitere Anwendungen ohne eigenes Rezept.</p>
            <b>Mischungen ansehen →</b>
          </Link>
          <Link to="/collections/substratwelt-pflanzsubstrate-mischungen-zusatze#einzelbestandteile" prefetch="intent" className="leaf-home-path">
            <span>03 · Komponenten</span>
            <strong>Einzelbestandteile kaufen</strong>
            <p>Lava, Perlite, Pinienrinde, Seramis und weitere Bestandteile für eigene Rezepturen.</p>
            <b>Bestandteile ansehen →</b>
          </Link>
        </div>

        {substrateProducts.length ? (
          <div className="leaf-home-substrate__products" aria-label="Ausgewählte Substratprodukte">
            {substrateProducts.slice(0, 6).map((product) => (
              <article key={product.id}>
                <Link to={`/products/${product.handle}`} prefetch="intent">
                  {product.featuredImage ? (
                    <Image
                      data={product.featuredImage}
                      sizes="(min-width: 1000px) 16vw, (min-width: 650px) 30vw, 46vw"
                    />
                  ) : (
                    <div className="leaf-home-product-placeholder">LEAF</div>
                  )}
                  <span>{product.vendor || 'LEAFerservice'}</span>
                  <h3>{product.title}</h3>
                </Link>
                <Money data={product.priceRange.minVariantPrice} />
              </article>
            ))}
          </div>
        ) : null}
      </section>


      <section className="leaf-home-story" aria-labelledby="leaf-story-title">
        <div className="leaf-home-story__visual">
          {substrateProducts.find((product) => product.featuredImage)?.featuredImage ? (
            <Image data={substrateProducts.find((product) => product.featuredImage)!.featuredImage!} sizes="(min-width: 900px) 42vw, 90vw" />
          ) : <div className="leaf-home-story__fallback" aria-hidden="true">LEAFerservice</div>}
        </div>
        <div className="leaf-home-story__copy">
          <p className="page-eyebrow">Hinter LEAFerservice</p>
          <h2 id="leaf-story-title">Aus Begeisterung für Pflanzen. Mit Blick fürs Detail.</h2>
          <p>LEAFerservice ist aus der praktischen Beschäftigung mit Zimmerpflanzen entstanden: Welche Mischung passt wirklich zu den Wurzeln? Wie viel Licht braucht ein Standort? Und welches Zubehör macht die Pflege einfacher?</p>
          <p>Statt beliebiger Produktlisten verbinden wir ausgewählte Komponenten, eigene Substratideen und verständliche Orientierung. Damit du eine Lösung findest, die zu deiner Pflanze und deinem Zuhause passt.</p>
          <div className="leaf-home-story__actions"><Link to="/collections/all" prefetch="intent">Sortiment entdecken →</Link><Link to="/products/leafer-substrat-konfigurator" prefetch="intent">Eigenen Mix zusammenstellen →</Link></div>
        </div>
      </section>
      <section className="leaf-home-assistant" aria-labelledby="leaf-assistant-home-title">
        <div>
          <p className="page-eyebrow">Zweite Bedienebene · LEAF</p>
          <h2 id="leaf-assistant-home-title">Nicht suchen. Fragen.</h2>
          <p>
            LEAF ist nicht nur ein Chatfenster, sondern ein direkter Zugang zu Wissen, Navigation
            und passenden Shop-Inhalten. Text und Realtime-Sprache bleiben verfügbar, während du
            dich durch den Shop bewegst.
          </p>
        </div>
        <div className="leaf-home-assistant__examples">
          <button type="button" onClick={openLeafAssistant}>„Welches Substrat passt zu meiner Alocasia?“</button>
          <button type="button" onClick={openLeafAssistant}>„Welche Lampe reicht für dieses Regal?“</button>
          <button type="button" onClick={openLeafAssistant}>„Bring mich zu Bewässerung für drei Pflanzen.“</button>
        </div>
      </section>

      <LeafAtrium locale="de" showAtrium={false} />

      <section className="leaf-campus-shortcut" aria-labelledby="leaf-shortcut-title">
        <div>
          <p className="page-eyebrow">Direkter Weg</p>
          <h2 id="leaf-shortcut-title">Du weißt schon, was du brauchst?</h2>
          <p>
            Die Erlebnisstruktur ist kein Zwangspfad. Sortiment, Suche, Warenkorb und Checkout
            bleiben jederzeit direkt erreichbar.
          </p>
        </div>
        <div className="leaf-campus-shortcut__links">
          <Link to="/collections/all" prefetch="intent">Gesamtes Sortiment →</Link>
          <Link to="/search" prefetch="intent">Produkte suchen →</Link>
          <Link to="/products/leafer-substrat-konfigurator" prefetch="intent">Substrat konfigurieren →</Link>
        </div>
      </section>
    </main>
  );
}

const HOMEPAGE_QUERY = `#graphql
  query LeafHomepage($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    collection(handle: "substratwelt-pflanzsubstrate-mischungen-zusatze") {
      id
      title
      description
      image { id url altText width height }
      products(first: 6) {
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
  }
` as const;
