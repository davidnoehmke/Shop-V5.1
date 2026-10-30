const routePairs = [
  ['/raumplanung', '/en/planning'],
  ['/welten/licht', '/en/worlds/light'],
  ['/welten/bewaesserung', '/en/worlds/water'],
  ['/welten/gefaesse', '/en/worlds/containers'],
  ['/welten/anzucht', '/en/worlds/propagation'],
  [
    '/collections/substratwelt-pflanzsubstrate-mischungen-zusatze',
    '/en/substrate',
  ],
] as const;

export function alternateLanguagePath(path: string) {
  const url = new URL(path, 'https://leaferservice.com');
  const english = url.pathname === '/en' || url.pathname.startsWith('/en/');
  const known = routePairs.find(
    (pair) => pair[english ? 1 : 0] === url.pathname,
  );
  const mapped = known
    ? known[english ? 0 : 1]
    : english
      ? url.pathname
          .replace(/^\/en(?=\/|$)/, '')
          .replace('/brands/', '/marken/') || '/'
      : url.pathname === '/'
        ? '/en'
        : url.pathname.startsWith('/marken/')
          ? url.pathname.replace('/marken/', '/en/brands/')
          : `/en${url.pathname}`;
  return `${mapped}${url.search}${url.hash}`;
}
