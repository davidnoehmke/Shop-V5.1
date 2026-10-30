import {useState} from 'react';
import type {ReactNode} from 'react';

export type ComparablePot = {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  price?: {amount: string; currencyCode: string} | null;
  availableForSale?: boolean | null;
  diameterCm?: number | null;
  heightCm?: number | null;
  material?: string | null;
  drainage?: string | null;
  waterReservoir?: boolean | null;
};

const MAX_COMPARE = 3;
const UNKNOWN = 'Nicht angegeben';
const currency = (price: ComparablePot['price']) =>
  price ? new Intl.NumberFormat('de-DE', {style: 'currency', currency: price.currencyCode}).format(Number(price.amount)) : UNKNOWN;

export function PotCompare({products, heading = 'Pflanzgefäße vergleichen'}: {products: ComparablePot[]; heading?: string}) {
  const [selected, setSelected] = useState<string[]>([]);
  const choices = products.filter((item) => selected.includes(item.id));
  const add = (id: string) => setSelected((current) => current.includes(id) ? current : current.length < MAX_COMPARE ? [...current, id] : current);
  const remove = (id: string) => setSelected((current) => current.filter((value) => value !== id));
  const facts: {label: string; value: (item: ComparablePot) => ReactNode}[] = [
    {label: 'Hersteller', value: (item) => item.vendor || UNKNOWN},
    {label: 'Preis', value: (item) => currency(item.price)},
    {label: 'Durchmesser', value: (item) => item.diameterCm != null ? `${item.diameterCm} cm` : UNKNOWN},
    {label: 'Höhe', value: (item) => item.heightCm != null ? `${item.heightCm} cm` : UNKNOWN},
    {label: 'Material', value: (item) => item.material || UNKNOWN},
    {label: 'Wasserablauf', value: (item) => item.drainage || UNKNOWN},
    {label: 'Wasserreservoir', value: (item) => item.waterReservoir == null ? UNKNOWN : item.waterReservoir ? 'Ja' : 'Nein'},
    {label: 'Verfügbarkeit', value: (item) => item.availableForSale == null ? UNKNOWN : item.availableForSale ? 'Bestellbar' : 'Derzeit nicht bestellbar'},
  ];

  return (
    <section className="pot-compare" aria-labelledby="pot-compare-title">
      <p className="page-eyebrow">LEAFerservice · Ehrlich vergleichen</p>
      <h2 id="pot-compare-title">{heading}</h2>
      <p>Wähle bis zu drei Produkte. Nicht bestätigte Eigenschaften werden bewusst als „Nicht angegeben“ dargestellt.</p>
      <div className="pot-compare__choices">
        {products.map((item) => {
          const active = selected.includes(item.id);
          return (
            <article className="pot-compare__choice" key={item.id}>
              {item.imageUrl ? <img src={item.imageUrl} alt={item.imageAlt || item.title} loading="lazy" /> : null}
              <div><strong>{item.title}</strong><p>{currency(item.price)}</p></div>
              <button type="button" aria-pressed={active} disabled={!active && selected.length >= MAX_COMPARE} onClick={() => active ? remove(item.id) : add(item.id)}>
                {active ? 'Entfernen' : 'Vergleichen'}
              </button>
            </article>
          );
        })}
      </div>
      <p aria-live="polite">{selected.length} von {MAX_COMPARE} Produkten ausgewählt</p>
      {choices.length > 0 ? (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Keyboard focus is required to horizontally scroll this named comparison region.
        <div className="pot-compare__scroll" role="region" aria-label="Produktvergleich" tabIndex={0}>
          <table>
            <caption>Vergleich der ausgewählten Pflanzgefäße</caption>
            <thead><tr><th scope="col">Merkmal</th>{choices.map((item) => <th scope="col" key={item.id}><a href={`/products/${encodeURIComponent(item.handle)}`}>{item.title}</a></th>)}</tr></thead>
            <tbody>{facts.map((fact) => <tr key={fact.label}><th scope="row">{fact.label}</th>{choices.map((item) => <td key={item.id}>{fact.value(item)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : <p>Wähle ein Produkt aus, um den Vergleich zu starten.</p>}
    </section>
  );
}
