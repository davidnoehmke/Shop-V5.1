export function localizedPath(path: string, pathname: string) {
  const isEnglish = pathname === '/en' || pathname.startsWith('/en/');
  if (!isEnglish || !path.startsWith('/') || path === '/en' || path.startsWith('/en/')) return path;
  if (path.startsWith('/marken/')) return path.replace('/marken/', '/en/brands/');
  if (/^\/(collections|products|blogs|pages|policies|search|cart)(\/|$|\?)/.test(path)) {
    return `/en${path}`;
  }
  return path;
}
