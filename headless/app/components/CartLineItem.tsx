import type {CartLineUpdateInput} from '@shopify/hydrogen/storefront-api-types';
import type {CartLayout, LineItemChildrenMap} from '~/components/CartMain';
import {CartForm, Image, type OptimisticCartLine} from '@shopify/hydrogen';
import {useVariantUrl} from '~/lib/variants';
import {Link} from 'react-router';
import {ProductPrice} from './ProductPrice';
import {useAside} from './Aside';
import {localizedPath} from '~/lib/locale-path';
import type {
  CartApiQueryFragment,
  CartLineFragment,
} from 'storefrontapi.generated';

export type CartLine = OptimisticCartLine<CartApiQueryFragment>;

/**
 * A single line item in the cart. It displays the product image, title, price.
 * It also provides controls to update the quantity or remove the line item.
 * If the line is a parent line that has child components (like warranties or gift wrapping), they are
 * rendered nested below the parent line.
 */
export function CartLineItem({
  layout,
  line,
  childrenMap,
  locale = 'de',
}: {
  layout: CartLayout;
  line: CartLine;
  childrenMap: LineItemChildrenMap;
  locale?: 'de' | 'en';
}) {
  const {id, merchandise} = line;
  const {product, title, image, selectedOptions} = merchandise;
  const lineItemUrl = useVariantUrl(product.handle, selectedOptions);
  const {close} = useAside();
  const lineItemChildren = childrenMap[id];
  const childrenLabelId = `cart-line-children-${id}`;

  return (
    <li key={id} className="cart-line">
      <div className="cart-line-inner">
        {image && (
          <Image
            alt={title}
            aspectRatio="1/1"
            data={image}
            height={100}
            loading="lazy"
            width={100}
          />
        )}

        <div>
          <Link
            prefetch="intent"
            to={localizedPath(lineItemUrl, locale === 'en' ? '/en/cart' : '/cart')}
            onClick={() => {
              if (layout === 'aside') {
                close();
              }
            }}
          >
            <p>
              <strong>{product.title}</strong>
            </p>
          </Link>
          <ProductPrice price={line?.cost?.totalAmount} />
          <ul>
            {selectedOptions.map((option) => (
              <li key={option.name}>
                <small>
                  {option.name}: {option.value}
                </small>
              </li>
            ))}
          </ul>
          {line.attributes?.filter(({key}) => key === 'Rezeptur').map(({key, value}) => (
            <p key={key} className="cart-line-recipe"><strong>{locale === 'en' ? 'Recipe' : 'Rezeptur'}:</strong> {value}</p>
          ))}
          <CartLineQuantity line={line} locale={locale} />
        </div>
      </div>

      {lineItemChildren ? (
        <div>
          <p id={childrenLabelId} className="sr-only">
            {locale === 'en' ? 'Line items with' : 'Artikel mit'} {product.title}
          </p>
          <ul aria-labelledby={childrenLabelId} className="cart-line-children">
            {lineItemChildren.map((childLine) => (
              <CartLineItem
                childrenMap={childrenMap}
                key={childLine.id}
                line={childLine}
                layout={layout}
                locale={locale}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

/**
 * Provides the controls to update the quantity of a line item in the cart.
 * These controls are disabled when the line item is new, and the server
 * hasn't yet responded that it was successfully added to the cart.
 */
function CartLineQuantity({line, locale}: {line: CartLine; locale: 'de' | 'en'}) {
  if (!line || typeof line?.quantity === 'undefined') return null;
  const {id: lineId, quantity, isOptimistic} = line;
  const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0));
  const nextQuantity = Number((quantity + 1).toFixed(0));

  return (
    <div className="cart-line-quantity">
      <small>{locale === 'en' ? 'Quantity' : 'Menge'}: {quantity} &nbsp;&nbsp;</small>
      <CartLineUpdateButton locale={locale} lines={[{id: lineId, quantity: prevQuantity}]}>
        <button
          aria-label={locale === 'en' ? 'Decrease quantity' : 'Menge verringern'}
          disabled={quantity <= 1 || !!isOptimistic}
          name="decrease-quantity"
          value={prevQuantity}
        >
          <span>&#8722; </span>
        </button>
      </CartLineUpdateButton>
      &nbsp;
      <CartLineUpdateButton locale={locale} lines={[{id: lineId, quantity: nextQuantity}]}>
        <button
          aria-label={locale === 'en' ? 'Increase quantity' : 'Menge erhöhen'}
          name="increase-quantity"
          value={nextQuantity}
          disabled={!!isOptimistic}
        >
          <span>&#43;</span>
        </button>
      </CartLineUpdateButton>
      &nbsp;
      <CartLineRemoveButton lineIds={[lineId]} disabled={!!isOptimistic} locale={locale} />
    </div>
  );
}

/**
 * A button that removes a line item from the cart. It is disabled
 * when the line item is new, and the server hasn't yet responded
 * that it was successfully added to the cart.
 */
function CartLineRemoveButton({
  lineIds,
  disabled,
  locale,
}: {
  lineIds: string[];
  disabled: boolean;
  locale: 'de' | 'en';
}) {
  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route={locale === 'en' ? '/en/cart' : '/cart'}
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds}}
    >
      <button disabled={disabled} type="submit">
        {locale === 'en' ? 'Remove' : 'Entfernen'}
      </button>
    </CartForm>
  );
}

function CartLineUpdateButton({
  children,
  lines,
  locale,
}: {
  children: React.ReactNode;
  lines: CartLineUpdateInput[];
  locale: 'de' | 'en';
}) {
  const lineIds = lines.map((line) => line.id);

  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route={locale === 'en' ? '/en/cart' : '/cart'}
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{lines}}
    >
      {children}
    </CartForm>
  );
}

/**
 * Returns a unique key for the update action. This is used to make sure actions modifying the same line
 * items are not run concurrently, but cancel each other. For example, if the user clicks "Menge erhöhen"
 * and "Menge verringern" in rapid succession, the actions will cancel each other and only the last one will run.
 * @param lineIds - line ids affected by the update
 * @returns
 */
function getUpdateKey(lineIds: string[]) {
  return [CartForm.ACTIONS.LinesUpdate, ...lineIds].join('-');
}

