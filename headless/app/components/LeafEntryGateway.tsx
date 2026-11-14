import {Image, Money} from '@shopify/hydrogen';
import type {CurrencyCode} from '@shopify/hydrogen/storefront-api-types';
import {Link} from 'react-router';
import {ENTRY_COPY, ENTRY_INTENTS} from '~/lib/entry-gateway';
import type {EntryLocale} from '~/lib/entry-gateway';

export type EntryImage = {
  id?: string;
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};
export type EntryStory = {
  id: string;
  title: string;
  handle: string;
  blogHandle: string;
  excerpt: string;
  image?: EntryImage | null;
};

export type EntryProduct = {
  id: string; title: string; handle: string; vendor: string;
  featuredImage?: EntryImage | null;
  priceRange: {minVariantPrice: {amount: string; currencyCode: CurrencyCode}};
};

type Props = {
  locale: EntryLocale;
  heroImage?: EntryImage | null;
  stories?: EntryStory[];
  products?: EntryProduct[];
};

/** Server-rendered entry routes; native disclosures also work before hydration. */
export function LeafEntryGateway({locale, heroImage, stories = [], products = []}: Props) {
  const text = ENTRY_COPY[locale];
  const prefix = locale === 'en' ? '/en' : '';
  return (
    <main className="leaf-entry">
      <section className="leaf-entry__hero" aria-labelledby="leaf-entry-title">
        <div className="leaf-entry__hero-copy">
          <p className="leaf-entry__eyebrow">{text.eyebrow}</p>
          <h1 id="leaf-entry-title">{text.title}<br /><span>{text.titleEnd}</span></h1>
          <p className="leaf-entry__lead">{text.intro}</p>
          <div className="leaf-entry__actions">
            <a className="leaf-entry__button" href="#leaf-anliegen">{text.explore}<span aria-hidden="true">&darr;</span></a>
            <Link className="leaf-entry__text-link" to={`${prefix}/collections/all`} prefetch="intent">{text.shop}<span aria-hidden="true">&rarr;</span></Link>
          </div>
          <p className="leaf-entry__trust">{text.trust}</p>
        </div>
        <figure className="leaf-entry__hero-media">
          {heroImage ? <Image data={heroImage} alt={heroImage.altText || text.imageCaption} aspectRatio="4/5" sizes="(min-width: 1000px) 42vw, 90vw" loading="eager" fetchPriority="high" /> : (
            <div className="leaf-entry__hero-placeholder"><span aria-hidden="true">LEAF</span><p>{text.fallback}</p></div>
          )}
          <figcaption><span>{text.imageCaption}</span><span aria-hidden="true">01 / LEAF</span></figcaption>
        </figure>
      </section>

      <section id="leaf-anliegen" className="leaf-entry__section" aria-labelledby="leaf-entry-intents">
        <header className="leaf-entry__section-heading">
          <p className="leaf-entry__eyebrow">{text.step}</p>
          <h2 id="leaf-entry-intents">{text.question}</h2>
          <p>{text.questionHint}</p>
        </header>
        <div className="leaf-entry__intents">
          {ENTRY_INTENTS[locale].map((intent, index) => (
            <details className={`leaf-entry__intent leaf-entry__intent--${intent.id}`} key={intent.id}>
              <summary>
                <span className="leaf-entry__intent-top"><span>{String(index + 1).padStart(2, '0')}</span><span>{intent.world}</span></span>
                <span className="leaf-entry__intent-title">{intent.title}</span>
                <span className="leaf-entry__intent-bottom">{text.details}<span className="leaf-entry__plus" aria-hidden="true">+</span></span>
              </summary>
              <div className="leaf-entry__intent-content">
                <p>{intent.description}</p>
                <Link className="leaf-entry__button" to={intent.href} prefetch="intent">{intent.action}<span aria-hidden="true">&rarr;</span></Link>
                <Link className="leaf-entry__text-link" to={intent.alternative.href} prefetch="intent">{intent.alternative.label}<span aria-hidden="true">&rarr;</span></Link>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="leaf-entry__section leaf-entry__knowledge" aria-labelledby="leaf-entry-knowledge">
        <header className="leaf-entry__section-heading">
          <p className="leaf-entry__eyebrow">{text.knowledgeKicker}</p>
          <h2 id="leaf-entry-knowledge">{text.knowledgeTitle}</h2>
          <p>{text.knowledgeText}</p>
          <Link className="leaf-entry__text-link" to={`${prefix}/blogs`} prefetch="intent">{text.knowledgeAction}<span aria-hidden="true">&rarr;</span></Link>
        </header>
        {stories.length > 0 ? <div className="leaf-entry__stories">
          {stories.slice(0, 3).map((story) => (
            <article className="leaf-entry__story" key={story.id}>
              <Link to={`${prefix}/blogs/${encodeURIComponent(story.blogHandle)}/${encodeURIComponent(story.handle)}`} prefetch="intent">
                {story.image ? <Image data={story.image} alt={story.image.altText || story.title} aspectRatio="4/3" sizes="(min-width: 800px) 30vw, 90vw" loading="lazy" /> : null}
                <h3>{story.title}</h3>
                {story.excerpt ? <p>{story.excerpt}</p> : null}
                <span className="leaf-entry__story-link">{text.articleAction}<span aria-hidden="true">&rarr;</span></span>
              </Link>
            </article>
          ))}
        </div> : null}
      </section>

      {products.length > 0 ? <section className="leaf-entry__section" aria-labelledby="leaf-entry-products">
        <header className="leaf-entry__section-heading">
          <p className="leaf-entry__eyebrow">Substrate Lab</p>
          <h2 id="leaf-entry-products">{locale === 'de' ? 'Dein Anfang darf klein sein.' : 'Your beginning can be small.'}</h2>
          <p>{locale === 'de' ? 'Entdecke Mischungen und Bestandteile aus unserem Sortiment.' : 'Discover mixes and components from our catalog.'}</p>
        </header>
        <div className="leaf-entry__products">
          {products.slice(0, 6).map((product) => <article className="leaf-entry__product" key={product.id}>
            <Link to={`${prefix}/products/${encodeURIComponent(product.handle)}`} prefetch="intent">
              {product.featuredImage ? <Image data={product.featuredImage} alt={product.featuredImage.altText || product.title} aspectRatio="1/1" sizes="(min-width: 800px) 30vw, 44vw" loading="lazy" /> : <div className="leaf-entry__product-placeholder" aria-hidden="true">LEAF</div>}
              <span className="leaf-entry__product-vendor">{product.vendor || 'LEAFerservice'}</span>
              <h3>{product.title}</h3>
            </Link>
            <div className="leaf-entry__price">{locale === 'de' ? 'Ab ' : 'From '}<Money data={product.priceRange.minVariantPrice} /></div>
          </article>)}
        </div>
      </section> : null}

      <section className="leaf-entry__journey" aria-labelledby="leaf-entry-journey">
        <p className="leaf-entry__eyebrow">{text.journeyKicker}</p>
        <h2 id="leaf-entry-journey">{text.journeyTitle}</h2>
        <p>{text.journeyText}</p>
        <Link className="leaf-entry__button leaf-entry__button--light" to={`${prefix}/blogs`} prefetch="intent">{text.knowledgeAction}<span aria-hidden="true">&rarr;</span></Link>
      </section>

      <section className="leaf-entry__section leaf-entry__faq" aria-labelledby="leaf-entry-faq">
        <h2 id="leaf-entry-faq">{text.faqTitle}</h2>
        {text.faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}
      </section>
      <nav className="leaf-entry__shortcuts" aria-label={text.shortcutTitle}>
        <h2>{text.shortcutTitle}</h2>
        <Link to={`${prefix}/collections/all`} prefetch="intent">{text.shop} &rarr;</Link>
        <Link to={`${prefix}/search`} prefetch="intent">{text.search} &rarr;</Link>
        <Link to={`${prefix}/blogs`} prefetch="intent">{text.knowledgeAction} &rarr;</Link>
      </nav>
    </main>
  );
}
