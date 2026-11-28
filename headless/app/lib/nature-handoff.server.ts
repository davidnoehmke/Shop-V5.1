import {publishedRegions, regionStations} from './nature-explorer.server';
import {natureHandoff} from './nature-handoff';

export async function loadNatureHandoff(env: Env, url: URL) {
  const region = url.searchParams.get('learn_region');
  const level = url.searchParams.get('learn_level');
  if (
    !region ||
    !level ||
    !/^[a-z0-9-]{1,80}$/.test(region) ||
    !/^[a-z0-9-]{1,80}$/.test(level)
  )
    return null;
  try {
    const [regions, stations] = await Promise.all([
      publishedRegions(env),
      regionStations(env, region),
    ]);
    return natureHandoff(regions, stations, region, level);
  } catch {
    return null;
  }
}
