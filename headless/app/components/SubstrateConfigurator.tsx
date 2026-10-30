import {useMemo, useState} from 'react';
import {Image, Money} from '@shopify/hydrogen';
import type {CurrencyCode} from '@shopify/hydrogen/storefront-api-types';
import {Link} from 'react-router';
import {AddToCartButton} from '~/components/AddToCartButton';
import {useAside} from '~/components/Aside';
import {equalShares, rebalance, type MixPart} from '~/lib/substrate-mix';

type Locale = 'de' | 'en';

type MoneyData = {amount: string; currencyCode: CurrencyCode};
type ImageData = {
  id?: string | null;
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};

export type SubstrateVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  price: MoneyData;
  selectedOptions: Array<{name: string; value: string}>;
};

export type SubstrateComponentProduct = {
  id: string;
  handle: string;
  title: string;
  featuredImage?: ImageData | null;
  priceRange: {minVariantPrice: MoneyData};
};

export type SubstrateConfiguratorProduct = {
  id: string;
  title: string;
  handle: string;
  descriptionHtml: string;
  featuredImage?: ImageData | null;
  variants: {nodes: SubstrateVariant[]};
};

export function SubstrateConfigurator({
  product,
  components,
  locale = 'de',
}: {
  product: SubstrateConfiguratorProduct;
  components: SubstrateComponentProduct[];
  locale?: Locale;
}) {
  const isEnglish = locale === 'en';
  const {open} = useAside();
  const variants = product.variants.nodes;
  const firstAvailable = variants.find((variant) => variant.availableForSale) ?? variants[0];
  const [variantId, setVariantId] = useState(firstAvailable?.id ?? '');
  const [mix, setMix] = useState<MixPart[]>([]);
  const selectedVariant = variants.find((variant) => variant.id === variantId) ?? firstAvailable;

  const recipe = useMemo(
    () => mix.map((part) => `${part.title} ${part.share}%`).join(' · '),
    [mix],
  );

  function toggleComponent(component: SubstrateComponentProduct) {
    const exists = mix.some((part) => part.id === component.id);
    if (exists) {
      setMix((current) =>
        equalShares(current.filter((part) => part.id !== component.id).map(({share: _share, ...part}) => part)),
      );
      return;
    }
    if (mix.length >= 4) return;
    setMix((current) =>
      equalShares([
        ...current.map(({share: _share, ...part}) => part),
        {id: component.id, handle: component.handle, title: component.title},
      ]),
    );
  }

  const total = mix.reduce((sum, part) => sum + part.share, 0);
  const attributes = mix.length
    ? [
        {key: 'Rezeptur', value: recipe},
        {key: 'Rezepturstand', value: 'Headless individuell'},
      ]
    : [];

  return (
    <div className="substrate-configurator">
      <section className="substrate-configurator__hero">
        <div>
          <p className="page-eyebrow">{isEnglish ? 'LEAF · custom substrate' : 'LEAF · individuelles Substrat'}</p>
          <h1>{isEnglish ? 'Build a substrate that always totals 100%.' : 'Mische dein Substrat – immer exakt 100 %.'}</h1>
          <p>
            {isEnglish
              ? 'Choose the plant profile and volume, then combine up to four substrate components. Adjust one share and LEAF automatically balances the others.'
              : 'Wähle Pflanzentyp und Menge und kombiniere anschließend bis zu vier Bestandteile. Änderst du einen Anteil, gleicht LEAF die übrigen automatisch aus.'}
          </p>
        </div>
        {product.featuredImage ? (
          <Image data={product.featuredImage} sizes="(min-width: 900px) 42vw, 100vw" loading="eager" />
        ) : null}
      </section>

      <section className="substrate-configurator__commerce" aria-labelledby="substrate-variant-heading">
        <div>
          <p className="page-eyebrow">{isEnglish ? '1 · Base variant' : '1 · Basisvariante'}</p>
          <h2 id="substrate-variant-heading">{isEnglish ? 'Plant profile & volume' : 'Pflanzentyp & Menge'}</h2>
          <label>
            <span className="sr-only">{isEnglish ? 'Select variant' : 'Variante auswählen'}</span>
            <select value={variantId} onChange={(event) => setVariantId(event.currentTarget.value)}>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id} disabled={!variant.availableForSale}>
                  {variant.title}
                </option>
              ))}
            </select>
          </label>
          {selectedVariant ? (
            <p className="substrate-configurator__price"><Money data={selectedVariant.price} /></p>
          ) : null}
        </div>

        <div>
          <p className="page-eyebrow">{isEnglish ? '2 · Components' : '2 · Bestandteile'}</p>
          <h2>{isEnglish ? 'Choose up to four' : 'Bis zu vier auswählen'}</h2>
          <div className="substrate-component-picker">
            {components.map((component) => {
              const active = mix.some((part) => part.id === component.id);
              const disabled = !active && mix.length >= 4;
              return (
                <button
                  type="button"
                  key={component.id}
                  className={active ? 'substrate-component-option is-active' : 'substrate-component-option'}
                  aria-pressed={active}
                  disabled={disabled}
                  onClick={() => toggleComponent(component)}
                >
                  {component.featuredImage ? (
                    <Image data={component.featuredImage} sizes="80px" />
                  ) : null}
                  <span>{component.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {mix.length ? (
        <section className="substrate-mixer" aria-labelledby="substrate-mixer-heading">
          <div className="substrate-mixer__head">
            <div>
              <p className="page-eyebrow">{isEnglish ? '3 · Fine tune' : '3 · Feinabstimmung'}</p>
              <h2 id="substrate-mixer-heading">{isEnglish ? 'Your recipe' : 'Deine Rezeptur'}</h2>
            </div>
            <strong className={total === 100 ? 'is-valid' : 'is-invalid'}>{total} %</strong>
          </div>

          <div className="substrate-pot-visual" aria-label={isEnglish ? 'Visual substrate mix' : 'Visuelle Substratmischung'}>
            {mix.map((part) => (
              <div key={part.id} style={{height: `${part.share}%`}}>
                <span>{part.title} · {part.share}%</span>
              </div>
            ))}
          </div>

          <div className="substrate-sliders">
            {mix.map((part, index) => (
              <label key={part.id}>
                <span>{part.title} <strong>{part.share}%</strong></span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={part.share}
                  onChange={(event) => {
                    const requested = Number(event.currentTarget.value);
                    setMix((current) => rebalance(current, index, requested));
                  }}
                />
              </label>
            ))}
          </div>

          <p className="substrate-recipe-text">{recipe}</p>
        </section>
      ) : (
        <p className="substrate-configurator__empty">
          {isEnglish ? 'Select at least one component to create a custom recipe.' : 'Wähle mindestens einen Bestandteil, um eine individuelle Rezeptur zu erstellen.'}
        </p>
      )}

      <section className="substrate-configurator__checkout">
        <div>
          <p className="page-eyebrow">{isEnglish ? '4 · Add to cart' : '4 · In den Warenkorb'}</p>
          <h2>{isEnglish ? 'Recipe travels with the cart line' : 'Die Rezeptur bleibt an der Position gespeichert'}</h2>
          <p>
            {isEnglish
              ? 'The selected recipe is transferred as cart attributes so it remains attached through checkout.'
              : 'Die ausgewählte Mischung wird als Warenkorb-Eigenschaft übertragen und bleibt damit bis zur Bestellung an der Position.'}
          </p>
        </div>
        <AddToCartButton
          disabled={!selectedVariant?.availableForSale || !mix.length || total !== 100}
          onSuccess={() => open('cart')}
          lines={selectedVariant ? [{
            merchandiseId: selectedVariant.id,
            quantity: 1,
            attributes,
            selectedVariant: {...selectedVariant, product},
          }] : []}
        >
          {isEnglish ? 'Add custom substrate' : 'Individuelles Substrat hinzufügen'}
        </AddToCartButton>
      </section>

      <p className="substrate-configurator__back">
        <Link to={isEnglish ? '/en/substrate' : '/collections/substratwelt-pflanzsubstrate-mischungen-zusatze'}>
          {isEnglish ? '← Back to substrate world' : '← Zurück zur Substratwelt'}
        </Link>
      </p>
    </div>
  );
}
