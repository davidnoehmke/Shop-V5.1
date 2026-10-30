/** Keep existing Shopify numeric variant links valid without changing IDs. */
export function variantGid(value: string | null): string | null {
  if (value === null) return null;
  if (!/^[1-9]\d*$/.test(value)) throw new Response('Ungültige Variante', {status: 400});
  return `gid://shopify/ProductVariant/${value}`;
}

/** Cart redirects may only lead to a path on this storefront. */
export function safeCartRedirect(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return null;
  return value;
}
