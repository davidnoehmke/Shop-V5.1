export type Citation = {label: string; url: string};
export type Photo = {
  path: string; caption_de: string; caption_en: string; credit: string;
  source: string; license: string; license_url: string;
};
export type ZoomStage = {
  id: string; min_zoom: number; label_de: string; label_en: string;
  question_de: string; question_en: string; answer_de: string; answer_en: string;
  source_citations: Citation[]; station_slug?: string;
};
export type ExplorerData = {
  zoom_story?: ZoomStage[];

  media?: Photo; summary_en?: string; title_en?: string; teaser_en?: string; detail_en?: string;
  depth_cm?: [number, number]; ph?: number; horizon?: string; taxon?: string;
  plot_id?: string; observed_on?: string;
};
export type Region = {
  slug: string; center_lat: number; center_lon: number; title_de: string; title_en?: string; summary_de: string;
  source_citations: Citation[]; explorer_data: ExplorerData;
};
export type Station = {
  slug: string; region_slug: string; latitude: number; longitude: number; title_de: string; category: string;
  teaser_de: string; detail_de: string; priority: number; source_citations: Citation[];
  related_paths: string[]; explorer_data: ExplorerData;
};

async function rows<T>(env: Env, view: string, query: Record<string, string>): Promise<T[]> {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) throw new Error('Atlas unavailable');
  const url = new URL('/rest/v1/' + view, env.SUPABASE_URL);
  url.search = new URLSearchParams(query).toString();
  const response = await fetch(url, {
    headers: {apikey: env.SUPABASE_PUBLISHABLE_KEY}, signal: AbortSignal.timeout(4500),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Atlas unavailable');
  return await response.json() as T[];
}

export function publishedRegions(env: Env) {
  return rows<Region>(env, 'ecosystem_public_regions', {
    select: 'slug,center_lat,center_lon,title_de,title_en,summary_de,source_citations,explorer_data', order: 'title_de,slug',
  });
}

export function regionStations(env: Env, region: string) {
  return rows<Station>(env, 'ecosystem_public_hotspots', {
    select: 'slug,region_slug,latitude,longitude,title_de,category,teaser_de,detail_de,priority,source_citations,related_paths,explorer_data',
    region_slug: 'eq.' + region, order: 'priority,slug',
  });
}

export function relatedStations(env: Env, path: string) {
  return rows<Pick<Station, 'region_slug' | 'slug' | 'title_de'> & {title_en?: string}>(env, 'ecosystem_public_hotspots', {
    select: 'slug,region_slug,title_de,title_en:explorer_data->>title_en', related_paths: 'cs.' + JSON.stringify([path]),
    order: 'priority,slug', limit: '4',
  }).catch(() => []);
}
