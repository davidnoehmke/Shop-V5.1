import {data, useLoaderData} from 'react-router';
import type {Route} from './+types/pages.nature-globe';
import {publishedRegions, regionStations} from '~/lib/nature-explorer.server';
import {validStages} from '~/lib/zoom-knowledge';
import {NatureOrbit} from '~/components/NatureOrbit';
import styles from '~/styles/nature-orbit.css?url';
export const links = () => [{rel: 'stylesheet', href: styles}];
export const meta = () => [{title: 'Interaktiver Globus | LEAFerservice'}];
export async function loader({context, request}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const english = url.pathname.startsWith('/en/');
  const regions = await publishedRegions(context.env).catch(() => {throw new Response('Atlas unavailable', {status: 503});});
  const stations = (await Promise.all(regions.map(r => regionStations(context.env, r.slug)))).flat();
  const regionId = url.searchParams.get('region') ?? undefined;
  if (regionId && !regions.some(r => r.slug === regionId)) throw new Response('Region not found', {status: 404});
  const levelId = url.searchParams.get('level') ?? undefined;
  if (levelId && (!regionId || !validStages(regions.find(r=>r.slug===regionId)!).some(s=>s.id===levelId))) {
    throw new Response('Learning level not found', {status:404});
  }
  const requested = url.searchParams.get('date');
  const date = url.searchParams.get('imagery') === 'daily' ?
    requested ?? new Date(Date.now() - 86400000).toISOString().slice(0,10) : undefined;
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || date < '2000-02-24' || date > new Date().toISOString().slice(0,10))) {
    throw new Response('Invalid imagery date', {status: 400});
  }
  return data({regions, stations, date, english, regionId, levelId}, {headers: {'Cache-Control': 'no-store'}});
}
export default function NatureGlobePage() {return <NatureOrbit {...useLoaderData<typeof loader>()} />;}
