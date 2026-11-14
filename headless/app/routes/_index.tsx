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
            Ohne Login nutzbar · Keine Werbe-Pop-ups · Beratung nur auf Wunsch · Shopify-Checkout
          </p>
        </div>
        <div className="leaf-home-entry__visual">
          <img
            className="leaf-home-entry__image"
            src="/brand/homepage-hero.webp"
            alt="Pflanzenplatz mit Monstera, Substratbestandteilen und Stecklingen"
            width={1672}
            height={941}
            fetchPriority="high"
          />
        </div>
      </section>

      <nav className="leaf-mobile-shortcuts" aria-label="Schnelleinstieg in die Produktwelten">
        <Link to="/collections/all" prefetch="intent">Shop entdecken <span aria-hidden="true">↗</span></Link>
        <Link to="/products/leafer-substrat-konfigurator" prefetch="intent">Substrat mischen <span aria-hidden="true">↗</span></Link>
        <Link to="/raumplaner-3d" prefetch="intent">Raum planen <span aria-hidden="true">↗</span></Link>
        <Link to="/search" prefetch="intent">Produkte finden <span aria-hidden="true">↗</span></Link>
      </nav>

      <section className="leaf-studio-gateway" aria-label="Interaktive Pflanzentools">
        <div>
          <p className="page-eyebrow">LEAF Studio · Werkzeuge für deine Entscheidung</p>
          <h2>Planen und vergleichen, bevor du kaufst.</h2>
          <p>Nutze die Tools kostenlos und ohne Anmeldung. Wähle passende Produkte bewusst statt auf Werbeversprechen zu vertrauen.</p>
        </div>
        <div className="leaf-studio-gateway__links">
          <Link to="/raumplaner-3d" prefetch="intent"><strong>3D-Raumplaner</strong><span>Sechs Bereiche erkunden →</span></Link>
          <Link to="/pflanzenlicht-vergleich" prefetch="intent"><strong>Leuchtmittel vergleichen</strong><span>Zwei echte Produkte gegenüberstellen →</span></Link>
          <Link to="/products/leafer-substrat-konfigurator" prefetch="intent"><strong>3D-Substratkonfigurator</strong><span>Eigene 100-%-Mischung erstellen →</span></Link>
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

      <section className="leaf-quiet-advice" aria-label="Freiwillige Produkthilfe">
        <div>
          <p className="page-eyebrow">Passende Produkte statt Werbedruck</p>
          <h2>Finde in Ruhe, was deine Pflanzen brauchen.</h2>
          <p>Entdecke passende Materialien im Sortiment. Wenn du Unterstützung möchtest, ist LEAF für dich da – ohne automatisch geöffnete Fenster und ohne Verkaufsdruck.</p>
        </div>
        <div className="leaf-quiet-advice__actions">
          <Link to="/collections/all" prefetch="intent">Produkte ansehen →</Link>
          <button type="button" onClick={openLeafAssistant}>Freiwillig beraten lassen</button>
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
      <aside aria-label="Live Labs Entwicklungstagebuch" style={{borderTop: '1px solid rgba(100,120,100,.25)',padding: '22px 0 30px',marginTop: '36px'}}>
        <div style={{display: 'flex',flexWrap: 'wrap',alignItems: 'center',justifyContent: 'space-between',gap: '14px'}}>
          <div>
            <p style={{fontSize: '11px',letterSpacing: '.13em',textTransform: 'uppercase',opacity: .7,marginBottom: '5px'}}>Live Labs · Einblicke in die Entwicklung</p>
            <p style={{fontSize: '14px',margin: 0}}>Wie ich LEAFerservice technisch weiterentwickle – transparent und Schritt für Schritt.</p>
          </div>
          <a href="https://leaferservice.com/blogs/live-labs/shopify-liquid-headless-commerce-migration-werkstattbericht" style={{fontSize: '13px',textDecoration: 'underline',textUnderlineOffset: '4px'}}>Entwicklungstagebuch lesen →</a>
        </div>
      </aside>
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
