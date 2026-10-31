import {Link} from 'react-router';
import type {Route} from './+types/en._index';
import {LeafAtrium} from '~/components/LeafAtrium';

export const meta: Route.MetaFunction = () => [
  {title: 'Substrates, grow lights & plant guidance | LEAFerservice'},
  {
    name: 'description',
    content:
      'LEAFerservice combines substrate systems, a custom substrate configurator, grow lighting, irrigation and plant knowledge with the LEAF AI assistant.',
  },
];

export default function EnglishHome() {
  function openLeafAssistant() {
    window.dispatchEvent(new Event('leaf:assistant:open'));
  }

  return (
    <main className="leafer-home leaf-homepage">
      <section className="leaf-home-entry" aria-labelledby="leaf-home-title-en">
        <div className="leaf-home-entry__copy">
          <p className="page-eyebrow">LEAFerservice · Understand plants better</p>
          <h1 id="leaf-home-title-en">What does your plant need?</h1>
          <p className="leaf-home-entry__lead">
            Start with your goal rather than a product shelf. LEAF helps you navigate – or go
            directly to substrates, the configurator and our curated plant worlds.
          </p>
          <div className="leaf-home-entry__actions">
            <button type="button" className="leaf-home-entry__assistant" onClick={openLeafAssistant}>
              Ask LEAF
            </button>
            <Link to="/en/products/leafer-substrat-konfigurator" prefetch="intent">
              Configure substrate
            </Link>
            <a href="#leaf-worlds">Explore worlds</a>
          </div>
          <p className="leaf-home-entry__trust">
            No login required · Shopify checkout · Guidance and purchasing remain separate steps
          </p>
        </div>
        <div className="leaf-home-entry__visual">
          <img
            className="leaf-home-entry__image"
            src="/brand/homepage-hero.webp"
            alt="Monstera plant with substrate ingredients and plant cuttings"
            width={1672}
            height={941}
            fetchPriority="high"
          />
        </div>
      </section>

      <section className="leaf-home-substrate" aria-labelledby="leaf-substrate-title-en">
        <div className="leaf-home-substrate__intro">
          <div>
            <p className="page-eyebrow">Core expertise · Substrates</p>
            <h2 id="leaf-substrate-title-en">Mix it, choose it or configure it yourself.</h2>
          </div>
          <p>
            Our substrate world deliberately comes before manufacturer worlds: ready mixes,
            individual components and a custom 100% recipe provide three clear paths.
          </p>
        </div>

        <div className="leaf-home-substrate__paths">
          <Link to="/en/products/leafer-substrat-konfigurator" prefetch="intent" className="leaf-home-path leaf-home-path--primary">
            <span>01 · Configurator</span>
            <strong>Build your own mix</strong>
            <p>Combine up to four components, balance them to 100% and add the recipe to cart.</p>
            <b>Open configurator →</b>
          </Link>
          <Link to="/en/substrate" prefetch="intent" className="leaf-home-path">
            <span>02 · Ready mixes</span>
            <strong>Choose a proven mix</strong>
            <p>Prepared substrate concepts for common indoor plant requirements.</p>
            <b>Explore mixes →</b>
          </Link>
          <Link to="/en/substrate#components" prefetch="intent" className="leaf-home-path">
            <span>03 · Components</span>
            <strong>Buy individual components</strong>
            <p>Build or refine your own substrate recipe from individual materials.</p>
            <b>Explore components →</b>
          </Link>
        </div>
      </section>

      <section className="leaf-home-assistant" aria-labelledby="leaf-assistant-home-title-en">
        <div>
          <p className="page-eyebrow">Second interface · LEAF</p>
          <h2 id="leaf-assistant-home-title-en">Don’t search. Ask.</h2>
          <p>
            LEAF is a direct route into knowledge, navigation and relevant storefront content.
            Text and realtime voice remain available while you move through the shop.
          </p>
        </div>
        <div className="leaf-home-assistant__examples">
          <button type="button" onClick={openLeafAssistant}>“Which substrate suits my Alocasia?”</button>
          <button type="button" onClick={openLeafAssistant}>“Which grow light fits this shelf?”</button>
          <button type="button" onClick={openLeafAssistant}>“Take me to watering for three plants.”</button>
        </div>
      </section>

      <LeafAtrium locale="en" showAtrium={false} />

      <section className="leaf-campus-shortcut" aria-labelledby="leaf-shortcut-title-en">
        <div>
          <p className="page-eyebrow">Direct route</p>
          <h2 id="leaf-shortcut-title-en">Already know what you need?</h2>
          <p>Collections, search, cart and checkout remain directly accessible at all times.</p>
        </div>
        <div className="leaf-campus-shortcut__links">
          <Link to="/en/collections/all" prefetch="intent">All products →</Link>
          <Link to="/en/search" prefetch="intent">Search products →</Link>
          <Link to="/en/products/leafer-substrat-konfigurator" prefetch="intent">Configure substrate →</Link>
        </div>
      </section>
    </main>
  );
}
