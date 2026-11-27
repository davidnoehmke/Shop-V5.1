export const explorerPath = '/pages/nature-explorer';

export function explorerUrl(english: boolean, region?: string, station?: string, more = false) {
  const search = new URLSearchParams();
  if (region) search.set('region', region);
  if (station && region) search.set('station', station);
  if (more) search.set('info', '1');
  return (english ? '/en' : '') + explorerPath + (search.size ? '?' + search.toString() : '');
}

export function isShopLearningPath(path: string) {
  return /^\/(?:products|collections|pages|blogs)\/[\w/-]+$/.test(path) && path !== explorerPath ||
    path === '/raumplaner-3d';
}
