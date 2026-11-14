export interface FooterLink {
  id: string;
  title: string;
  url?: string | null;
}

const ROUTE_ALIASES: Record<string, string> = {
  '/policies/privacy-policy': '/pages/datenschutzerklaerung',
  '/policies/refund-policy': '/pages/rueckerstattungs-rueckgaberichtlinie',
  '/policies/shipping-policy': '/pages/versandrichtlinie',
  '/policies/terms-of-service': '/pages/nutzungsbedingungen',
};

const LINK_TITLES: Record<string, {de: string; en: string}> = {
  '/collections/all': {de: 'Shop', en: 'Shop'},
  '/search': {de: 'Suche', en: 'Search'},
  '/pages/labs': {de: 'LEAF Labs', en: 'LEAF Labs'},
};

export function footerDestination(url: string, internalDomains: string[]) {
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol)) return null;
    const internal = internalDomains.some((domain) => {
      try {
        return (
          parsed.hostname ===
          new URL(domain.includes('://') ? domain : `https://${domain}`)
            .hostname
        );
      } catch {
        return false;
      }
    });
    return internal
      ? parsed.pathname + parsed.search + parsed.hash
      : parsed.href;
  } catch {
    return null;
  }
}

function destinationKey(url: string) {
  const path =
    url
      .split(/[?#]/, 1)[0]
      .replace(/^\/en(?=\/|$)/, '')
      .replace(/\/+$/, '') || '/';
  return ROUTE_ALIASES[path] || path;
}

export function additionalFooterLinks(
  items: FooterLink[],
  primaryPaths: string[],
  internalDomains: string[],
  locale: 'de' | 'en',
) {
  const seen = new Set(primaryPaths.map(destinationKey));
  return items.flatMap((item) => {
    if (!item.url) return [];
    const destination = footerDestination(item.url, internalDomains);
    if (!destination) return [];
    const key = destinationKey(destination);
    if (seen.has(key)) return [];
    seen.add(key);
    const internal = destination.startsWith('/');
    const base = internal
      ? destination.replace(/^\/en(?=[/?#]|$)/, '') || '/'
      : destination;
    const url =
      internal && locale === 'en'
        ? `/en${base.startsWith('/') ? base : `/${base}`}`
        : base;
    return [
      {
        ...item,
        title: internal ? LINK_TITLES[key]?.[locale] || item.title : item.title,
        url,
        external: !internal,
      },
    ];
  });
}
