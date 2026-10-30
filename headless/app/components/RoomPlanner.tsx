import {createElement, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router';
import {useNonce} from '@shopify/hydrogen';
import builderUrl from '../../../assets/interieur-room-builder.js?url';
import {AddToCartButton} from '~/components/AddToCartButton';
import {useAside} from '~/components/Aside';

export type PlannerProduct = {
  id: string;
  title: string;
  handle: string;
  featuredImage?: {url: string} | null;
  variants: {
    nodes: {
      id: string;
      title: string;
      availableForSale: boolean;
      price: {amount: string; currencyCode: string};
    }[];
  };
};
type PlannedObject = {variantId: string | null; title: string; url: string};
export function RoomPlanner({
  products,
  locale,
}: {
  products: PlannerProduct[];
  locale: 'de' | 'en';
}) {
  const root = useRef<HTMLElement>(null);
  const [objects, setObjects] = useState<PlannedObject[]>([]);
  const {open} = useAside();
  const nonce = useNonce();
  const en = locale === 'en';
  const prefix = en ? '/en' : '';
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const sync = (event: Event) =>
      setObjects(
        (event as CustomEvent<{objects: PlannedObject[]}>).detail.objects,
      );
    element.addEventListener('room:summary', sync);
    (element as HTMLElement & {updateSummary?: () => void}).updateSummary?.();
    if (
      !customElements.get('interieur-room-builder') &&
      !document.querySelector('script[data-room-builder]')
    ) {
      const script = document.createElement('script');
      script.src = builderUrl;
      script.nonce = nonce;
      script.dataset.roomBuilder = 'true';
      document.head.append(script);
    }
    return () => element.removeEventListener('room:summary', sync);
  }, [nonce, locale]);
  const variants = products.flatMap((product) =>
    product.variants.nodes
      .filter((v) => v.availableForSale)
      .map((variant) => ({product, variant})),
  );
  const grouped = new Map<string, number>();
  for (const obj of objects)
    if (obj.variantId && variants.some((v) => v.variant.id === obj.variantId))
      grouped.set(obj.variantId, (grouped.get(obj.variantId) || 0) + 1);
  const lines = [...grouped].map(([merchandiseId, quantity]) => ({
    merchandiseId,
    quantity,
  }));
  return (
    <section
      id="room-planner"
      className="room-planner"
      aria-labelledby="room-planner-title"
    >
      <p className="page-eyebrow">
        {en ? '3D room planner' : '3D-Raumplanung'}
      </p>
      <h2 id="room-planner-title">
        {en
          ? 'Make space for your plants.'
          : 'Schaffe Platz für deine Pflanzen.'}
      </h2>
      <p>
        {en
          ? 'Set dimensions, add elements and select objects to move them. Product dimensions are illustrative; check product specifications before buying.'
          : 'Raummaße festlegen, Elemente hinzufügen und zum Verschieben auswählen. Produktgrößen sind schematisch; prüfe vor dem Kauf die Produktangaben.'}
      </p>
      {createElement(
        'interieur-room-builder',
        {
          ref: root,
          key: locale,
          'data-storage-key': 'leafer-headless-room-v1',
          'data-locale': locale,
          'data-currency': variants[0]?.variant.price.currencyCode || 'EUR',
        },
        <>
          <div className="room-planner__toolbar">
            {(['width', 'depth', 'height'] as const).map((key, i) => (
              <label key={key}>
                {
                  (en
                    ? ['Width', 'Depth', 'Height']
                    : ['Breite', 'Tiefe', 'Höhe'])[i]
                }{' '}
                (m)
                <input
                  type="number"
                  min="2"
                  max={key === 'height' ? 5 : 12}
                  step="0.1"
                  defaultValue={[4.2, 3.2, 2.5][i]}
                  {...{[`data-room-${key}`]: true}}
                />
              </label>
            ))}
          </div>
          <div className="room-planner__toolbar">
            {['plant', 'shelf', 'window'].map((kind, i) => (
              <button key={kind} type="button" data-add-primitive={kind}>
                {
                  (en
                    ? ['Plant', 'Shelf', 'Window']
                    : ['Pflanze', 'Regal', 'Fenster'])[i]
                }{' '}
                +
              </button>
            ))}
            <label>
              {en ? 'Product and variant' : 'Produkt und Variante'}
              <select data-builder-product-select defaultValue="">
                <option value="" disabled>
                  {en ? 'Select a product' : 'Produkt auswählen'}
                </option>
                {variants.map(({product, variant}) => (
                  <option
                    key={variant.id}
                    value={variant.id}
                    data-title={`${product.title} · ${variant.title}`}
                    data-search={product.title}
                    data-price={Math.round(Number(variant.price.amount) * 100)}
                    data-url={`${prefix}/products/${product.handle}`}
                    data-image={product.featuredImage?.url}
                  >
                    {product.title} · {variant.title}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" data-add-product disabled={!variants.length}>
              {en ? 'Place product' : 'Produkt platzieren'} +
            </button>
          </div>
          <canvas
            data-room-canvas
            width="1000"
            height="600"
            aria-label={
              en
                ? 'Room preview. Use the object selection and coordinate inputs below to edit.'
                : 'Raumvorschau. Zum Bearbeiten die Objektauswahl und Koordinatenfelder darunter nutzen.'
            }
          />
          <div className="room-planner__toolbar">
            <label>
              {en ? 'Selected object' : 'Ausgewähltes Objekt'}
              <select
                data-object-select
                aria-label={en ? 'Selected object' : 'Ausgewähltes Objekt'}
              />
            </label>
            <label>
              X (m)
              <input type="number" step="0.1" data-position="x" />
            </label>
            <label>
              Z (m)
              <input type="number" step="0.1" data-position="z" />
            </label>
            <button
              type="button"
              data-camera="-15"
              aria-label={en ? 'Rotate view left' : 'Ansicht nach links drehen'}
            >
              ↶
            </button>
            <button
              type="button"
              data-camera="15"
              aria-label={
                en ? 'Rotate view right' : 'Ansicht nach rechts drehen'
              }
            >
              ↷
            </button>
            <button type="button" data-object-rotate="15">
              {en ? 'Rotate object' : 'Objekt drehen'}
            </button>
            <button type="button" data-duplicate>
              {en ? 'Duplicate' : 'Duplizieren'}
            </button>
            <button type="button" data-delete>
              {en ? 'Remove object' : 'Objekt entfernen'}
            </button>
            <button type="button" data-builder-reset>
              {en ? 'Reset plan' : 'Plan zurücksetzen'}
            </button>
          </div>
          <div className="room-planner__summary">
            <span>
              {en ? 'Objects' : 'Objekte'}: <b data-summary-count>0</b>
            </span>
            <span>
              {en ? 'Product total' : 'Produktsumme'}:{' '}
              <b data-summary-price>—</b>
            </span>
          </div>
        </>,
      )}
      {!variants.length && (
        <p role="status">
          {en
            ? 'No orderable products are currently available for this plan. You can still plan the room.'
            : 'Für diesen Plan sind gerade keine bestellbaren Produkte verfügbar. Du kannst den Raum weiterhin planen.'}
        </p>
      )}
      <ul className="room-planner__products">
        {[...grouped.keys()].map((id) => {
          const item = variants.find((v) => v.variant.id === id)!;
          return (
            <li key={id}>
              <Link
                to={`${prefix}/products/${item.product.handle}?variant=${id.split('/').pop()}`}
              >
                {item.product.title} · {item.variant.title}
              </Link>{' '}
              × {grouped.get(id)}
            </li>
          );
        })}
      </ul>
      <AddToCartButton
        lines={lines}
        disabled={!lines.length}
        onSuccess={() => open('cart')}
      >
        {en ? 'Add setup to cart' : 'Setup in den Warenkorb'}
      </AddToCartButton>
    </section>
  );
}
