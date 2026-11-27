import type {Region, ZoomStage} from './nature-explorer.server';
import type {OrbitCamera} from './orbit';

function degreesBetween(camera: OrbitCamera, region: Region) {
  const rad = Math.PI / 180;
  const a = camera.lat * rad, b = region.center_lat * rad;
  return Math.acos(Math.max(-1, Math.min(1, Math.sin(a)*Math.sin(b) +
    Math.cos(a)*Math.cos(b)*Math.cos((camera.lon-region.center_lon)*rad)))) / rad;
}
export function validStages(region: Region): ZoomStage[] {
  const story = region.explorer_data.zoom_story;
  if (!Array.isArray(story)) return [];
  return story.filter(s => s &&
    typeof s.id === 'string' && Number.isFinite(s.min_zoom) && s.min_zoom >= 1 && s.min_zoom <= 24 &&
    typeof s.question_de === 'string' && typeof s.answer_de === 'string' &&
    Array.isArray(s.source_citations) && s.source_citations.some(c => c && typeof c.url === 'string' && /^https:\/\//.test(c.url)),
  ).sort((a,b) => a.min_zoom - b.min_zoom);
}
export function zoomKnowledge(regions: Region[], camera: OrbitCamera) {
  const ranked = regions.map(region => ({region, distance: degreesBetween(camera, region)}))
    .sort((a,b) => a.distance - b.distance);
  const nearest = ranked[0];
  const region = nearest && nearest.distance <= Math.max(3, 45/camera.zoom) ? nearest.region : undefined;
  const stages = region ? validStages(region) : [];
  const stage = stages.filter(s => s.min_zoom <= camera.zoom).at(-1) ??
    regions.flatMap(validStages).find(s => s.id === 'world');
  return {region, stages, stage};
}
