import {useEffect, useRef, useState} from 'react';
import {Link} from 'react-router';
import {ZoomKnowledge} from './ZoomKnowledge';
import {validStages, zoomKnowledge} from '~/lib/zoom-knowledge';
import {orbitRenderer} from '~/lib/orbit-renderer';
import {
  approachCamera,
  boundedCamera,
  viewportLocation,
  orbitPoint,
  detailBounds,
} from '~/lib/orbit';
import type {OrbitCamera} from '~/lib/orbit';
import type {Region, Station, ZoomStage} from '~/lib/nature-explorer.server';

type Props = {
  regions: Region[];
  stations: Station[];
  date?: string;
  english: boolean;
  regionId?: string;
  levelId?: string;
};
type Point = {x: number; y: number};
const distance = (points: Point[]) =>
  Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);

export function NatureOrbit({
  regions,
  stations,
  date,
  english,
  regionId,
  levelId,
}: Props) {
  const region = regions.find((r) => r.slug === regionId);
  const level = region && validStages(region).find((s) => s.id === levelId);
  const levelStation = stations.find((s) => s.slug === level?.station_slug);
  const initial: OrbitCamera = {
    lat: levelStation?.latitude ?? region?.center_lat ?? 18,
    lon: levelStation?.longitude ?? region?.center_lon ?? -46,
    zoom: level ? level.min_zoom + 0.35 : region ? 2.35 : 1,
  };
  const surface = useRef<HTMLCanvasElement>(null);
  const scene = useRef<HTMLElement>(null);
  const [viewport, setViewport] = useState({width: 0, height: 0});
  const [detailState, setDetailState] = useState<
    'idle' | 'loading' | 'ready' | 'unavailable'
  >('idle');
  const current = useRef(initial);
  const target = useRef(initial);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{
    camera: OrbitCamera;
    points: Point[];
    moved: boolean;
  } | null>(null);
  const pauseUntil = useRef(0);
  const [camera, setCamera] = useState(initial);
  const [ready, setReady] = useState(false);
  const [imagery, setImagery] = useState<
    'base' | 'loading' | 'daily' | 'fallback'
  >(date ? 'loading' : 'base');
  const [dock, setDock] = useState<'top' | 'bottom'>('bottom');
  const [side, setSide] = useState<'left' | 'right'>('left');
  const t = (de: string, en: string) => (english ? en : de);

  useEffect(() => {
    if (!surface.current) return;
    const canvas = surface.current;
    const root = scene.current!;
    const measure = new ResizeObserver(() =>
      setViewport({width: root.clientWidth, height: root.clientHeight}),
    );
    measure.observe(root);
    const previousOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    let renderer: ReturnType<typeof orbitRenderer>;
    try {
      renderer = orbitRenderer(canvas);
    } catch {
      renderer = null;
    }
    if (!renderer) {
      measure.disconnect();
      document.documentElement.style.overflow = previousOverflow;
      document.body.style.overflow = previousBodyOverflow;
      return;
    }
    let disposed = false,
      loaded = false,
      frame = 0,
      previous = 0;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const image = new Image();
    const daily = new Image();
    let detailImage: HTMLImageElement | null = null;
    let requested: OrbitCamera | null = null;
    let requestTime = 0;
    function requestDetail(now: number) {
      const camera = current.current;
      if (
        camera.zoom < 2.4 ||
        pointers.current.size ||
        now - requestTime < 700 ||
        Math.abs(camera.zoom - target.current.zoom) +
          Math.abs(camera.lat - target.current.lat) +
          Math.abs(camera.lon - target.current.lon) >
          0.03
      )
        return;
      const span = 180 / camera.zoom;
      if (
        requested &&
        Math.abs(camera.lat - requested.lat) < span * 0.2 &&
        Math.abs(camera.lon - requested.lon) < span * 0.2 &&
        Math.max(camera.zoom / requested.zoom, requested.zoom / camera.zoom) <
          1.45
      )
        return;
      requested = {...camera};
      requestTime = now;
      const bounds = detailBounds(camera).map((v) => Number(v.toFixed(3))) as [
        number,
        number,
        number,
        number,
      ];
      const image = new Image();
      if (detailImage) {
        detailImage.onload = null;
        detailImage.onerror = null;
      }
      detailImage = image;
      setDetailState('loading');
      image.onload = () => {
        if (disposed || detailImage !== image) return;
        renderer!.detail(image, bounds);
        setDetailState('ready');
      };
      image.onerror = () => {
        if (!disposed && detailImage === image) setDetailState('unavailable');
      };
      const params = new URLSearchParams({bbox: bounds.join(',')});
      if (date) params.set('date', date);
      else params.set('layer', 'base');
      image.src = '/api/nature-imagery?' + params;
    }
    image.onload = () => {
      if (disposed) return;
      renderer.image(image);
      loaded = true;
      setReady(true);
      if (date) daily.src = '/api/nature-imagery?date=' + date;
    };
    daily.onload = () => {
      if (!disposed) {
        renderer.image(daily);
        setImagery('daily');
      }
    };
    daily.onerror = () => {
      if (!disposed) setImagery('fallback');
    };
    image.src = '/nature/earth-map.webp';
    function tick(now: number) {
      const elapsed = previous ? Math.min(50, now - previous) : 16;
      previous = now;
      if (loaded && !document.hidden) {
        if (
          !reduce.matches &&
          now > pauseUntil.current &&
          target.current.zoom < 1.2 &&
          !pointers.current.size
        ) {
          target.current = {
            ...target.current,
            lon: target.current.lon + elapsed * 0.0018,
          };
        }
        current.current = approachCamera(
          current.current,
          target.current,
          reduce.matches ? 1 : 1 - Math.exp(-elapsed / 130),
        );
        renderer!.draw(current.current);
        setCamera(current.current);
        requestDetail(now);
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    function wheel(event: WheelEvent) {
      event.preventDefault();
      pauseUntil.current = performance.now() + 30000;
      target.current = boundedCamera({
        ...target.current,
        zoom:
          target.current.zoom *
          Math.exp(
            -Math.max(
              -90,
              Math.min(
                90,
                event.deltaY *
                  (event.deltaMode === 1
                    ? 16
                    : event.deltaMode === 2
                      ? innerHeight
                      : 1),
              ),
            ) * 0.002,
          ),
      });
    }
    root.addEventListener('wheel', wheel, {passive: false});
    const preventPageScroll = (event: TouchEvent) => event.preventDefault();
    root.addEventListener('touchmove', preventPageScroll, {passive: false});
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      renderer.dispose();
      image.onload = null;
      daily.onload = null;
      daily.onerror = null;
      if (detailImage) {
        detailImage.onload = null;
        detailImage.onerror = null;
      }
      root.removeEventListener('wheel', wheel);
      root.removeEventListener('touchmove', preventPageScroll);
      measure.disconnect();
      document.documentElement.style.overflow = previousOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [date]);

  function fly(lat: number, lon: number, zoom: number) {
    pauseUntil.current = performance.now() + 30000;
    target.current = boundedCamera({lat, lon, zoom});
  }
  function resetGesture() {
    const points = [...pointers.current.values()];
    gesture.current = points.length
      ? {camera: current.current, points, moved: points.length > 1}
      : null;
  }
  function pick(x: number, y: number) {
    const box = surface.current!.getBoundingClientRect();
    const hit = viewportLocation(
      x - box.left,
      y - box.top,
      {width: box.width, height: box.height},
      current.current,
    );
    if (hit) fly(hit.lat, hit.lon, current.current.zoom * 1.9);
  }
  const activeRegion = zoomKnowledge(regions, camera).region?.slug;
  function jump(destination: Region, stage: ZoomStage) {
    const site = stations.find(
      (s) =>
        s.slug === stage.station_slug && s.region_slug === destination.slug,
    );
    fly(
      site?.latitude ?? destination.center_lat,
      site?.longitude ?? destination.center_lon,
      stage.min_zoom * 1.09,
    );
  }
  return (
    <article ref={scene} className="nature-orbit" aria-label="Nature Explorer">
      <header className="nature-orbit__heading">
        <Link to={english ? '/en' : '/'}>LEAFerservice ↗</Link>
        <h1>Nature Explorer</h1>
      </header>
      <div className="nature-orbit__sphere">
        <img
          className="nature-orbit__fallback"
          src="/nature/earth.webp"
          alt={t('Erde, westliche Hemisphäre', 'Earth, western hemisphere')}
          hidden={ready}
        />
        <canvas
          ref={surface}
          className="nature-orbit__canvas"
          tabIndex={0}
          role="img"
          aria-label={t(
            'Globus. Ziehen zum Drehen, tippen zum Annähern, zwei Finger zum Zoomen. Pfeiltasten drehen, Plus und Minus zoomen, Escape setzt zurück.',
            'Globe. Drag to rotate, tap to approach, pinch to zoom. Arrow keys rotate, plus and minus zoom, Escape resets.',
          )}
          onPointerDown={(e) => {
            pauseUntil.current = performance.now() + 30000;
            setDock(e.clientY > innerHeight * 0.55 ? 'top' : 'bottom');
            setSide(e.clientX > innerWidth * 0.5 ? 'left' : 'right');
            pointers.current.set(e.pointerId, {x: e.clientX, y: e.clientY});
            resetGesture();
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!pointers.current.has(e.pointerId) || !gesture.current) return;
            pointers.current.set(e.pointerId, {x: e.clientX, y: e.clientY});
            const points = [...pointers.current.values()],
              start = gesture.current;
            const center = (items: Point[]) => ({
              x: items.reduce((sum, p) => sum + p.x, 0) / items.length,
              y: items.reduce((sum, p) => sum + p.y, 0) / items.length,
            });
            const now = center(points),
              before = center(start.points);
            const dx = now.x - before.x,
              dy = now.y - before.y;
            if (Math.hypot(dx, dy) > 5) start.moved = true;
            const degrees =
              160 /
              Math.min(
                e.currentTarget.clientWidth,
                e.currentTarget.clientHeight,
              ) /
              start.camera.zoom;
            const zoom =
              points.length > 1 && start.points.length > 1
                ? (start.camera.zoom * distance(points)) /
                  Math.max(1, distance(start.points))
                : start.camera.zoom;
            target.current = boundedCamera({
              lon: start.camera.lon - dx * degrees,
              lat: start.camera.lat + dy * degrees,
              zoom,
            });
          }}
          onPointerUp={(e) => {
            const tap =
              pointers.current.size === 1 &&
              gesture.current &&
              !gesture.current.moved;
            pointers.current.delete(e.pointerId);
            resetGesture();
            // A remaining finger after a pinch continues the gesture without becoming a tap.
            if (gesture.current) gesture.current.moved = true;
            if (tap) pick(e.clientX, e.clientY);
          }}
          onPointerCancel={(e) => {
            pointers.current.delete(e.pointerId);
            resetGesture();
          }}
          onLostPointerCapture={(e) => {
            if (pointers.current.delete(e.pointerId)) resetGesture();
          }}
          onKeyDown={(e) => {
            const delta = {
              ArrowLeft: [-15, 0],
              ArrowRight: [15, 0],
              ArrowUp: [0, 10],
              ArrowDown: [0, -10],
            }[e.key];
            if (delta) {
              e.preventDefault();
              fly(
                target.current.lat + delta[1],
                target.current.lon + delta[0],
                target.current.zoom,
              );
            }
            if (['+', '=', '-', 'Escape'].includes(e.key)) {
              e.preventDefault();
              if (e.key === 'Escape') fly(initial.lat, initial.lon, 1);
              else
                fly(
                  target.current.lat,
                  target.current.lon,
                  target.current.zoom * (e.key === '-' ? 0.7 : 1.4),
                );
            }
          }}
        />
        {ready &&
          camera.zoom < 3.8 &&
          regions.map((region) => {
            const position = orbitPoint(
              region.center_lat,
              region.center_lon,
              camera,
              viewport.width ? viewport : undefined,
            );
            return (
              position && (
                <a
                  href={
                    '?region=' +
                    region.slug +
                    (date ? '&imagery=daily&date=' + date : '')
                  }
                  key={region.slug}
                  className="nature-orbit__point"
                  style={position}
                  onClick={(e) => {
                    e.preventDefault();
                    fly(region.center_lat, region.center_lon, 2.35);
                  }}
                >
                  <span className="nature-orbit__dot" />
                  <span>{(english && region.title_en) || region.title_de}</span>
                </a>
              )
            );
          })}
        {ready &&
          camera.zoom >= 3.8 &&
          stations
            .filter((s) => !activeRegion || s.region_slug === activeRegion)
            .map((s, index) => {
              const position = orbitPoint(
                s.latitude,
                s.longitude,
                camera,
                viewport.width ? viewport : undefined,
              );
              return (
                position && (
                  <a
                    key={s.slug}
                    href={
                      '/pages/nature-explorer?region=' +
                      s.region_slug +
                      '&station=' +
                      s.slug
                    }
                    className="nature-orbit__point nature-orbit__station"
                    style={{...position, marginTop: index * 38 + 'px'}}
                    onClick={(e) => {
                      e.preventDefault();
                      fly(
                        s.latitude,
                        s.longitude,
                        (validStages(
                          regions.find((r) => r.slug === s.region_slug)!,
                        ).find((level) => level.station_slug === s.slug)
                          ?.min_zoom ?? 7) * 1.09,
                      );
                    }}
                  >
                    <span className="nature-orbit__dot" />
                    <span>
                      {(english && s.explorer_data.title_en) || s.title_de}
                    </span>
                  </a>
                )
              );
            })}
      </div>
      <ZoomKnowledge
        regions={regions}
        stations={stations}
        camera={camera}
        english={english}
        dock={dock}
        side={side}
        jump={jump}
      />
      <footer className="nature-orbit__source">
        {detailState === 'loading' && (
          <span role="status">
            {t('Bilddetails werden geladen', 'Loading image detail')}
          </span>
        )}
        {detailState === 'ready' && (
          <a href="https://nasa-gibs.github.io/gibs-api-docs/">
            {t(
              'NASA GIBS · nachgeladene Bilddetails',
              'NASA GIBS · detailed imagery',
            )}
          </a>
        )}
        {detailState === 'unavailable' && (
          <span>
            {t(
              'Bilddetails derzeit eingeschränkt verfügbar',
              'Detailed imagery currently limited',
            )}
          </span>
        )}
        <a
          href={
            imagery === 'daily'
              ? 'https://worldview.earthdata.nasa.gov/'
              : 'https://commons.wikimedia.org/wiki/File:Land_ocean_ice_2048.jpg'
          }
        >
          {imagery === 'daily'
            ? 'NASA GIBS · MODIS Terra · ' + date
            : 'NASA / Reto Stöckli · Blue Marble'}
        </a>
        {imagery === 'daily' && (
          <span>
            {t(
              'Tagesaufnahmen · Wolken und Aufnahmelücken möglich',
              'Daily observations · clouds and coverage gaps possible',
            )}
          </span>
        )}
        {imagery === 'loading' && (
          <span>
            {t('Satellitenbild wird geladen', 'Loading satellite imagery')}
          </span>
        )}
        {imagery === 'fallback' && (
          <span role="status">
            {t(
              'NASA-Bild derzeit nicht verfügbar · historische Erdtextur',
              'NASA imagery unavailable · historical Earth texture',
            )}
          </span>
        )}
      </footer>
    </article>
  );
}
