export type RombergCategory = 'boqube' | 'houses' | 'essentials';

export function rombergCategory(product: {
  title: string;
  productType?: string | null;
}): RombergCategory {
  if (/\bboqube\b/i.test(product.title)) return 'boqube';
  if (product.productType === 'Anzuchtgewächshaus') return 'houses';
  return 'essentials';
}

export function groupRombergProducts<T extends {title: string; productType?: string | null}>(
  products: readonly T[],
): {key: RombergCategory; products: T[]}[] {
  const categories: RombergCategory[] = ['boqube', 'houses', 'essentials'];
  return categories.map((key) => ({
    key,
    products: products.filter((item) => rombergCategory(item) === key),
  })).filter((group) => group.products.length > 0);
}

/** Shopify is the source of truth. Do not fabricate product claims or prices. */
export function rombergSummary(value?: string | null, limit = 172): string {
  const normalized = (value || '')
    .replace(/([.!?])(?=[A-ZÄÖÜ])/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();
  if (normalized.length <= limit) return normalized;
  const cutoff = normalized.slice(0, limit + 1).lastIndexOf(' ');
  return normalized.slice(0, cutoff > 50 ? cutoff : limit).trimEnd() + '…';
}

export function relatedRombergProducts<T extends {handle: string; productType: string}>(
  candidates: readonly T[],
  current: {handle: string; productType: string},
  limit = 3,
): T[] {
  const others = candidates.filter((item) => item.handle !== current.handle);
  return [
    ...others.filter((item) => item.productType !== current.productType),
    ...others.filter((item) => item.productType === current.productType),
  ].slice(0, limit);
}

export type RombergSpecification = {key: string; label: string; value: string};

/** Extract only quantities literally present in Shopify product copy. */
export function rombergSpecifications(
  title: string,
  description: string,
  locale: 'de' | 'en' = 'de',
): RombergSpecification[] {
  const text = [title, description].join(' ');
  const english = locale === 'en';
  const result: RombergSpecification[] = [];
  const size = text.match(/\b\d+(?:[.,]\d+)?\s*[×x]\s*\d+(?:[.,]\d+)?(?:\s*[×x]\s*\d+(?:[.,]\d+)?)?\s*cm\b/i);
  if (size) result.push({key: 'dimensions', label: english ? 'Dimensions' : 'Maße', value: size[0].replace(/\s*[x×]\s*/g, ' × ')});
  const power = text.match(/\b\d+(?:[.,]\d+)?\s*(?:Watt|W)\b/i);
  if (power) result.push({key: 'power', label: english ? 'Power' : 'Leistung', value: power[0].replace(/Watt/i, 'W').replace(/\s*W$/, ' W')});
  const capacity = description.match(/\bbis zu\s+(\d+)\s+Quelltabletten\b/i);
  if (capacity) result.push({key: 'capacity', label: english ? 'Plug capacity' : 'Platz für Quelltabletten', value: english ? 'Up to ' + capacity[1] : 'Bis zu ' + capacity[1]});
  if (!capacity) {
    const pack = title.match(/\b(\d+)\s+Stück\b/i) ||
      description.match(/\b(\d+)\s+(?:Kokos-)?Quelltabletten\b/i);
    if (pack) result.push({key: 'package', label: english ? 'Pack quantity' : 'Packungsinhalt', value: pack[1] + (english ? ' pieces' : ' Stück')});
  }
  return result;
}
