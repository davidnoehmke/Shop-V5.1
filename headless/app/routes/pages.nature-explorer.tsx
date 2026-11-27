import {data, Link, useLoaderData} from 'react-router';
import type {Route} from './+types/pages.nature-explorer';
import {publishedRegions, regionStations} from '~/lib/nature-explorer.server';
import type {Photo} from '~/lib/nature-explorer.server';
import {explorerUrl, isShopLearningPath} from '~/lib/nature-navigation';
import styles from '~/styles/nature-explorer.css?url';

export const links = () => [{rel: 'stylesheet', href: styles}];

export async function loader({context, request}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const english = url.pathname.startsWith('/en/');
  const regionId = url.searchParams.get('region');
  const stationId = url.searchParams.get('station');
  const more = url.searchParams.get('info') === '1';
  const validSlug = (value: string | null) => value === null || /^[a-z0-9][a-z0-9-]{0,100}$/.test(value);
  if (!validSlug(regionId) || !validSlug(stationId) || (stationId && !regionId)) {
    throw new Response('Station nicht gefunden', {status: 404});
  }
  const [regions, stations] = await Promise.all([
    publishedRegions(context.env), regionId ? regionStations(context.env, regionId) : Promise.resolve([]),
  ]).catch(() => {throw new Response(english ? 'Atlas temporarily unavailable' : 'Atlas vorübergehend nicht verfügbar', {status: 503});});
  const region = regions.find((item) => item.slug === regionId);
  const station = stations.find((item) => item.slug === stationId);
  if ((regionId && !region) || (stationId && !station)) throw new Response('Station nicht gefunden', {status: 404});
  return data({regions, stations, region, station, english, more}, {headers: {'Cache-Control': 'no-store'}});
}

export const meta: Route.MetaFunction = ({data: page}) => {
  if (!page) return [{title: 'Nature Explorer | LEAFerservice'}];
  const {english, station, region} = page;
  const title = (english && (station?.explorer_data.title_en || region?.title_en)) || station?.title_de || region?.title_de || 'Nature Explorer';
  const description = (english && (station?.explorer_data.teaser_en || region?.explorer_data.summary_en)) || station?.teaser_de || region?.summary_de ||
    (english ? 'Explore plant habitats and measured soil profiles.' : 'Erkunde Pflanzenstandorte und gemessene Bodenprofile.');
  return [{title: title + ' | LEAFerservice'}, {name: 'description', content: description}];
};

const earth: Photo = {
  path: '/nature/earth.webp', caption_de: 'Westliche Hemisphäre · Satellitenmosaik',
  caption_en: 'Western Hemisphere · satellite mosaic', credit: 'NASA / Blue Marble',
  source: 'https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/',
  license: 'NASA', license_url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
};
function https(value?: string) {
  try {return value && new URL(value).protocol === 'https:' ? value : undefined;} catch {return undefined;}
}

export default function NatureExplorer() {
  const {regions, stations, station, region, english, more} = useLoaderData<typeof loader>();
  const t = (de: string, en: string) => english ? en : de;
  const link = (r?: string, s?: string, info = false) => explorerUrl(english, r, s, info);
  const details = station?.explorer_data ?? region?.explorer_data;
  const title = station ? (english && details?.title_en || station.title_de) :
    region ? (english && region.title_en || region.title_de) : t('Die Erde erkunden', 'Explore the Earth');
  const intro = station ? (english && details?.teaser_en || station.teaser_de) :
    region ? (english && details?.summary_en || region.summary_de) :
    t('Wähle eine Region. Entdecke, was dort wächst und wie der Boden unter den Wurzeln entsteht.',
      'Choose a region. Discover what grows there and how the soil beneath its roots forms.');
  const index = stations.findIndex((s) => s.slug === station?.slug);
  const next = region ? stations[index + 1] : undefined;
  const nextUrl = region ? (next ? link(region.slug, next.slug) : undefined) :
    regions.length === 1 ? link(regions[0].slug) : undefined;
  const backUrl = more ? link(region?.slug, station?.slug) :
    station ? (index > 0 ? link(region?.slug, stations[index - 1].slug) : link(region?.slug)) :
    region ? link() : (english ? '/en' : '/');
  const photo = region ? details?.media : earth;
  const sources = station?.source_citations ?? region?.source_citations ?? [];
  const paths = (station?.related_paths ?? []).filter((path) => typeof path === 'string' && isShopLearningPath(path));
  const stepLabel = station ? t('Station', 'Stop') + ' ' + (index + 1) + ' / ' + stations.length :
    region ? t('Region', 'Region') : t('Welt', 'World');
  return (
    <article className="nature-atlas" aria-label="Nature Explorer">
      <header className="nature-atlas__bar">
        <Link to={backUrl} aria-label={t('Zurück', 'Back')}>←</Link>
        <Link to={link()}>Nature Explorer</Link>
        <Link to={english ? '/en' : '/'}>Shop ↗</Link>
      </header>
      <div className="nature-atlas__stage" key={(station?.slug ?? region?.slug ?? 'world') + String(more)}>
        {photo && /^\/nature\/[\w-]+\.webp$/.test(photo.path) && (
          <figure className={'nature-atlas__photo' + (!region ? ' nature-atlas__photo--earth' : '')}>
            <img src={photo.path} alt={english ? photo.caption_en : photo.caption_de} fetchPriority="high" />
            {nextUrl && !more && <Link className="nature-atlas__zoom" to={nextUrl}
              aria-label={t('Näher erkunden', 'Explore closer')}>＋</Link>}
            <figcaption>{english ? photo.caption_en : photo.caption_de}</figcaption>
          </figure>
        )}
        <section className="nature-atlas__card">
          <span className="nature-atlas__level">{stepLabel}</span>
          <h1>{title}</h1>
          <p>{more && station ? (english && details?.detail_en || station.detail_de) : intro}</p>
          {!more && details?.depth_cm && <p className="nature-atlas__metrics">
            <strong>{details.depth_cm.join('–')} cm</strong>
            {details.horizon && <span>{t('Horizont', 'Horizon')} {details.horizon}</span>}
            {typeof details.ph === 'number' && <span>pH {details.ph.toLocaleString(english ? 'en' : 'de', {minimumFractionDigits: 1})}</span>}
          </p>}
          {more && <div className="nature-atlas__refs">
            {details?.plot_id && <span>{details.plot_id} · {details.observed_on}</span>}
            {sources.filter((s) => https(s?.url)).map((s) => <a href={s.url} key={s.url}>{s.label || t('Fachquelle', 'Source')} ↗</a>)}
            {photo && <span>{t('Bild', 'Image')} · <a href={https(photo.source)}>{photo.credit}</a> · <a href={https(photo.license_url)}>{photo.license}</a> · WebP</span>}
          </div>}
          {!region && !more && regions.length > 1 && <form className="nature-atlas__select" action={link()}>
            <select name="region" aria-label={t('Region auswählen', 'Choose region')}>{regions.map(r => <option value={r.slug} key={r.slug}>{english && r.title_en || r.title_de}</option>)}</select>
            <button type="submit">{t('Erkunden', 'Explore')}</button>
          </form>}
          {!region && !regions.length && <p>{t('Neue Regionen erscheinen hier nach der Veröffentlichung.', 'New regions appear here when published.')}</p>}
          {!more && paths.map(path => <Link className="nature-atlas__shop" key={path} to={(english ? '/en' : '') + path}>
            {path === '/products/leafer-substrat-konfigurator' ? t('Eigene Substratmischung planen', 'Plan your substrate mix') : path.split('/').pop()?.replaceAll('-', ' ')} ↗
          </Link>)}
          <nav className="nature-atlas__actions" aria-label={t('Erkunden', 'Explore')}>
            {!more && nextUrl && <Link className="nature-atlas__next" to={nextUrl}>{next ? (english && next.explorer_data.title_en || next.title_de) :
              (english && regions[0]?.title_en || regions[0]?.title_de)} →</Link>}
            {!more && region && !nextUrl && <Link className="nature-atlas__next" to={link()}>{t('Zur Welt', 'World view')} →</Link>}
            <Link className="nature-atlas__info" to={link(region?.slug, station?.slug, !more)}>
              {more ? t('Zur Ansicht', 'Back to view') : t('Info & Quellen', 'Info & sources')}</Link>
          </nav>
        </section>
      </div>
    </article>
  );
}
