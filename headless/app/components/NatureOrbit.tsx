import {useEffect, useRef, useState} from 'react';
import {Link} from 'react-router';
import {orbitRenderer} from '~/lib/orbit-renderer';
import {approachCamera, boundedCamera, orbitLocation, orbitPoint} from '~/lib/orbit';
import type {OrbitCamera} from '~/lib/orbit';
import type {Region, Station} from '~/lib/nature-explorer.server';
import {isShopLearningPath} from '~/lib/nature-navigation';

type Props = {regions: Region[]; stations: Station[]; date?: string; english: boolean; regionId?: string};
type Point = {x: number; y: number};
const distance = (points: Point[]) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);

export function NatureOrbit({regions, stations, date, english, regionId}: Props) {
  const region = regions.find(r => r.slug === regionId);
  const initial: OrbitCamera = {lat: region?.center_lat ?? 18, lon: region?.center_lon ?? -46, zoom: region ? 4 : 1};
  const surface = useRef<HTMLCanvasElement>(null);
  const current = useRef(initial);
  const target = useRef(initial);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{camera: OrbitCamera; points: Point[]; moved: boolean} | null>(null);
  const pauseUntil = useRef(0);
  const [camera, setCamera] = useState(initial);
  const [ready, setReady] = useState(false);
  const [imagery, setImagery] = useState<'base' | 'loading' | 'daily' | 'fallback'>(date ? 'loading' : 'base');
  const [selected, setSelected] = useState<Region | Station | null>(region ?? null);
  const [location, setLocation] = useState<OrbitCamera | null>(null);
  const t = (de: string, en: string) => english ? en : de;

  useEffect(() => {
    if (!surface.current) return;
    const canvas = surface.current;
    let renderer: ReturnType<typeof orbitRenderer>;
    try {renderer = orbitRenderer(canvas);} catch {return;}
    if (!renderer) return;
    let disposed = false, loaded = false, frame = 0, previous = 0;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const image = new Image();
    const daily = new Image();
    image.onload = () => {
      if (disposed) return;
      renderer.image(image); loaded = true; setReady(true);
      if (date) daily.src = '/api/nature-imagery?date=' + date;
    };
    daily.onload = () => {
      if (!disposed) {renderer.image(daily); setImagery('daily');}
    };
    daily.onerror = () => {if (!disposed) setImagery('fallback');};
    image.src = '/nature/earth-map.webp';
    function tick(now: number) {
      const elapsed = previous ? Math.min(50, now - previous) : 16;
      previous = now;
      if (loaded && !document.hidden) {
        if (!reduce.matches && now > pauseUntil.current && target.current.zoom < 1.2 && !pointers.current.size) {
          target.current = {...target.current, lon: target.current.lon + elapsed * .0018};
        }
        current.current = approachCamera(current.current, target.current, reduce.matches ? 1 : 1 - Math.exp(-elapsed / 130));
        renderer!.draw(current.current);
        setCamera(current.current);
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    function wheel(event: WheelEvent) {
      event.preventDefault();
      pauseUntil.current = performance.now() + 30000;
      target.current = boundedCamera({...target.current, zoom: target.current.zoom * Math.exp(-event.deltaY * .002)});
    }
    canvas.addEventListener('wheel', wheel, {passive: false});
    return () => {
      disposed = true; cancelAnimationFrame(frame); renderer.dispose();
      image.onload = null; daily.onload = null; daily.onerror = null;
      canvas.removeEventListener('wheel', wheel);
    };
  }, [date]);

  function fly(lat: number, lon: number, zoom: number, item: Region | Station | null = null) {
    pauseUntil.current = performance.now() + 30000;
    target.current = boundedCamera({lat, lon, zoom});
    setLocation(target.current); setSelected(item);
  }
  function resetGesture() {
    const points = [...pointers.current.values()];
    gesture.current = points.length ? {camera: current.current, points, moved: points.length > 1} : null;
  }
  function pick(x: number, y: number) {
    const box = surface.current!.getBoundingClientRect();
    const hit = orbitLocation((x - box.left)/box.width*2 - 1, 1 - (y - box.top)/box.height*2, current.current);
    if (hit) fly(hit.lat, hit.lon, current.current.zoom * 1.9);
  }
  const metadata = selected?.explorer_data;
  const title = selected ? (english && ('title_en' in selected ? selected.title_en : metadata?.title_en) || selected.title_de) : '';
  const summary = selected ? ('teaser_de' in selected ? (english && metadata?.teaser_en || selected.teaser_de) :
    (english && metadata?.summary_en || selected.summary_de)) : '';
  const photo = metadata?.media;
  const paths = selected && 'related_paths' in selected ? selected.related_paths.filter(isShopLearningPath) : [];
  const activeRegion = selected && 'region_slug' in selected ? selected.region_slug : selected?.slug;
  return <article className="nature-orbit" aria-label="Nature Explorer">
    <header className="nature-orbit__heading"><Link to={english ? '/en' : '/'}>LEAFerservice ↗</Link>
      <h1>Nature Explorer</h1></header>
    <div className="nature-orbit__sphere">
      <img className="nature-orbit__fallback" src="/nature/earth.webp" alt={t('Erde, westliche Hemisphäre', 'Earth, western hemisphere')} hidden={ready} />
      <canvas ref={surface} className="nature-orbit__canvas" tabIndex={0} role="img"
        aria-label={t('Globus. Ziehen zum Drehen, tippen zum Annähern, zwei Finger zum Zoomen. Pfeiltasten drehen, Plus und Minus zoomen, Escape setzt zurück.',
          'Globe. Drag to rotate, tap to approach, pinch to zoom. Arrow keys rotate, plus and minus zoom, Escape resets.')}
        onPointerDown={e => {
          pauseUntil.current = performance.now() + 30000;
          pointers.current.set(e.pointerId, {x: e.clientX, y: e.clientY}); resetGesture();
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={e => {
          if (!pointers.current.has(e.pointerId) || !gesture.current) return;
          pointers.current.set(e.pointerId, {x: e.clientX, y: e.clientY});
          const points = [...pointers.current.values()], start = gesture.current;
          const dx = points[0].x - start.points[0].x, dy = points[0].y - start.points[0].y;
          if (Math.hypot(dx, dy) > 5) start.moved = true;
          const degrees = 160 / e.currentTarget.clientWidth / start.camera.zoom;
          const zoom = points.length > 1 && start.points.length > 1 ?
            start.camera.zoom * distance(points) / Math.max(1, distance(start.points)) : start.camera.zoom;
          target.current = boundedCamera({lon: start.camera.lon - dx*degrees, lat: start.camera.lat + dy*degrees, zoom});
        }}
        onPointerUp={e => {
          const tap = pointers.current.size === 1 && gesture.current && !gesture.current.moved;
          pointers.current.delete(e.pointerId); resetGesture();
          // A remaining finger after a pinch continues the gesture without becoming a tap.
          if (gesture.current) gesture.current.moved = true;
          if (tap) pick(e.clientX, e.clientY);
        }}
        onPointerCancel={e => {pointers.current.delete(e.pointerId); resetGesture();}}
        onLostPointerCapture={e => {if (pointers.current.delete(e.pointerId)) resetGesture();}}
        onKeyDown={e => {
          const delta = {ArrowLeft: [-15,0], ArrowRight: [15,0], ArrowUp: [0,10], ArrowDown: [0,-10]}[e.key];
          if (delta) {e.preventDefault(); fly(target.current.lat + delta[1], target.current.lon + delta[0], target.current.zoom);}
          if (['+', '=', '-', 'Escape'].includes(e.key)) {
            e.preventDefault();
            if (e.key === 'Escape') fly(initial.lat, initial.lon, 1);
            else fly(target.current.lat, target.current.lon, target.current.zoom * (e.key === '-' ? .7 : 1.4), selected);
          }
        }} />
      {ready && regions.map(region => {
        const position = orbitPoint(region.center_lat, region.center_lon, camera);
        return position && <a href={'?region=' + region.slug + (date ? '&imagery=daily&date=' + date : '')}
          key={region.slug} className="nature-orbit__point" style={position}
          onClick={e => {e.preventDefault(); fly(region.center_lat, region.center_lon, 4, region);}}>
          <span className="nature-orbit__dot" /><span>{english && region.title_en || region.title_de}</span></a>;
      })}
      {ready && camera.zoom > 3 && stations.filter(s => !activeRegion || s.region_slug === activeRegion).map((s, index) => {
        const position = orbitPoint(s.latitude, s.longitude, camera);
        return position && <a key={s.slug} href={'/pages/nature-explorer?region=' + s.region_slug + '&station=' + s.slug}
          className="nature-orbit__point nature-orbit__station" style={{...position, marginTop: (index * 38) + 'px'}}
          onClick={e => {e.preventDefault(); fly(s.latitude, s.longitude, Math.max(6, camera.zoom), s);}}>
          <span className="nature-orbit__dot" /><span>{english && s.explorer_data.title_en || s.title_de}</span></a>;
      })}
    </div>
    <aside className="nature-orbit__story" aria-live="polite">
      {selected ? <>
        {photo && /^\/nature\/[\w-]+\.webp$/.test(photo.path) && <img src={photo.path} alt={english ? photo.caption_en : photo.caption_de} />}
        <div><h2>{title}</h2><p>{summary}</p>
          {metadata?.depth_cm && <p>{metadata.depth_cm.join('–')} cm · pH {metadata.ph}</p>}
          {paths.map(path => <Link key={path} to={(english ? '/en' : '') + path}>{t('Eigene Mischung planen', 'Plan your mix')} ↗</Link>)}
          <div className="nature-orbit__credits">
            {selected.source_citations.map(s => /^https:\/\//.test(s.url) && <a key={s.url} href={s.url}>{s.label} ↗</a>)}
            {photo && <span><a href={photo.source}>{photo.credit}</a> · <a href={photo.license_url}>{photo.license}</a> · WebP</span>}
          </div>
        </div>
      </> : <div><h2>{location ? location.lat.toFixed(2) + '° · ' + location.lon.toFixed(2) + '°' : t('Die Welt unter deinen Fingern', 'The world at your fingertips')}</h2>
        <p>{t('Ziehen zum Drehen · Tippen zum Annähern · Zwei Finger zum Zoomen', 'Drag to rotate · Tap to approach · Pinch to zoom')}</p></div>}
    </aside>
    <footer className="nature-orbit__source">
      <a href={imagery === 'daily' ? 'https://worldview.earthdata.nasa.gov/' : 'https://commons.wikimedia.org/wiki/File:Land_ocean_ice_2048.jpg'}>
        {imagery === 'daily' ? 'NASA GIBS · MODIS Terra · ' + date : 'NASA / Reto Stöckli · Blue Marble'}</a>
      {imagery === 'daily' && <span>{t('Tagesaufnahmen · Wolken und Aufnahmelücken möglich', 'Daily observations · clouds and coverage gaps possible')}</span>}
      {imagery === 'loading' && <span>{t('Satellitenbild wird geladen', 'Loading satellite imagery')}</span>}
      {imagery === 'fallback' && <span role="status">{t('NASA-Bild derzeit nicht verfügbar · historische Erdtextur', 'NASA imagery unavailable · historical Earth texture')}</span>}
    </footer>
  </article>;
}
