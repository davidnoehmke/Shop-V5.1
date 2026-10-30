import {Link, useNavigate} from 'react-router';
import {type MappedProductOptions} from '@shopify/hydrogen';
import type {
  Maybe,
  ProductOptionValueSwatch,
} from '@shopify/hydrogen/storefront-api-types';
import {AddToCartButton} from './AddToCartButton';
import {useAside} from './Aside';
import type {ProductFragment} from 'storefrontapi.generated';

type ProductFormLocale = 'de' | 'en';

const EN_LABELS: Record<string, string> = {
  Farbe: 'Colour',
  Grau: 'Grey',
  Gray: 'Grey',
  Weiss: 'White',
  Weiß: 'White',
  Leistung: 'Power',
  Variante: 'Variant',
  Durchmesser: 'Diameter',
  Größe: 'Size',
};

function localizeLabel(value: string, locale: ProductFormLocale) {
  if (locale !== 'en') return value;
  return EN_LABELS[value] ?? value;
}

export function ProductForm({
  productOptions,
  selectedVariant,
  locale = 'de',
}: {
  productOptions: MappedProductOptions[];
  selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
  locale?: ProductFormLocale;
}) {
  const navigate = useNavigate();
  const {open} = useAside();
  const available = Boolean(selectedVariant?.availableForSale);

  return (
    <div className="product-form">
      {productOptions.map((option) => {
        if (option.optionValues.length === 1) return null;

        return (
          <div className="product-options" key={option.name}>
            <p className="product-options__label"><span>{localizeLabel(option.name, locale)}</span><strong>{localizeLabel(option.optionValues.find((value) => value.selected)?.name || '', locale)}</strong></p>
            <div className="product-options-grid">
              {option.optionValues.map((value) => {
                const {
                  name,
                  handle,
                  variantUriQuery,
                  selected,
                  available,
                  exists,
                  isDifferentProduct,
                  swatch,
                } = value;
                const localizedName = localizeLabel(name, locale);
                const className = ['product-options-item', selected ? 'is-selected' : '', !available ? 'is-unavailable' : '', swatch?.color || swatch?.image ? 'is-swatch' : ''].filter(Boolean).join(' ');

                if (isDifferentProduct) {
                  return (
                    <Link
                      className={className}
                      key={option.name + name}
                      prefetch="intent"
                      preventScrollReset
                      replace
                      to={`${locale === 'en' ? '/en' : ''}/products/${handle}?${variantUriQuery}`}
                    >
                      <ProductOptionSwatch swatch={swatch} name={localizedName} />
                    </Link>
                  );
                }

                return (
                  <button
                    type="button"
                    aria-pressed={selected}
                    className={className}
                    key={option.name + name}
                    style={{
                      border: selected
                        ? '1px solid black'
                        : '1px solid transparent',
                      opacity: available ? 1 : 0.3,
                    }}
                    disabled={!exists}
                    onClick={() => {
                      if (!selected) {
                        void navigate(`?${variantUriQuery}`, {
                          replace: true,
                          preventScrollReset: true,
                        });
                      }
                    }}
                  >
                    <ProductOptionSwatch swatch={swatch} name={localizedName} />
                  </button>
                );
              })}
            </div>

          </div>
        );
      })}
      <p className={'product-form__availability' + (available ? ' is-available' : '')} aria-live="polite"><span aria-hidden="true" />{available ? (locale === 'en' ? 'Available to order' : 'Bestellbar') : (locale === 'en' ? 'Currently unavailable' : 'Derzeit nicht bestellbar')}</p>
      <AddToCartButton
        className="product-form__submit"
        disabled={!selectedVariant || !selectedVariant.availableForSale}
        onSuccess={() => {
          open('cart');
        }}
        lines={
          selectedVariant
            ? [
                {
                  merchandiseId: selectedVariant.id,
                  quantity: 1,
                  selectedVariant,
                },
              ]
            : []
        }
      >
        {selectedVariant?.availableForSale
          ? locale === 'en'
            ? 'Add to cart'
            : 'In den Warenkorb'
          : locale === 'en'
            ? 'Currently unavailable'
            : 'Nicht verfügbar'}
      </AddToCartButton>
    </div>
  );
}

function ProductOptionSwatch({
  swatch,
  name,
}: {
  swatch?: Maybe<ProductOptionValueSwatch> | undefined;
  name: string;
}) {
  const image = swatch?.image?.previewImage?.url;
  const color = swatch?.color;

  if (!image && !color) return name;

  return (
    <div
      aria-label={name}
      className="product-option-label-swatch"
      style={{
        backgroundColor: color || 'transparent',
      }}
    >
      {!!image && <img src={image} alt={name} />}
    </div>
  );
}
