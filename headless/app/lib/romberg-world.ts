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
