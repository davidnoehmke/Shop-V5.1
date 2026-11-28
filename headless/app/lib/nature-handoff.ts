import type {Region, Station} from './nature-explorer.server';

export const substratePath = '/products/leafer-substrat-konfigurator';
export type NatureHandoff = {
  region: string;
  level: string;
  title_de: string;
  title_en: string;
  question_de: string;
  question_en: string;
};

// Accept only a published, source-backed learning stage with an explicit editorial shop link.
export function natureHandoff(
  regions: Region[],
  stations: Station[],
  regionId: string | null,
  levelId: string | null,
): NatureHandoff | null {
  const region = regions.find((r) => r.slug === regionId);
  const stage = region?.explorer_data.zoom_story?.find((s) => s.id === levelId);
  const station = stations.find(
    (s) => s.region_slug === region?.slug && s.slug === stage?.station_slug,
  );
  if (
    !region ||
    !stage ||
    !station?.related_paths.includes(substratePath) ||
    !stage.source_citations?.some((s) => /^https:\/\//.test(s.url))
  )
    return null;
  return {
    region: region.slug,
    level: stage.id,
    title_de: region.title_de,
    title_en: region.title_en ?? region.title_de,
    question_de: stage.question_de,
    question_en: stage.question_en ?? stage.question_de,
  };
}
