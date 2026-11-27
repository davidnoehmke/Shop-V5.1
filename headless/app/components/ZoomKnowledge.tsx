import {useEffect, useRef, useState} from 'react';
import {Link} from 'react-router';
import type {CSSProperties} from 'react';
import type {Region, Station, ZoomStage} from '~/lib/nature-explorer.server';
import type {OrbitCamera} from '~/lib/orbit';
import {zoomKnowledge, validStages} from '~/lib/zoom-knowledge';
import {isShopLearningPath} from '~/lib/nature-navigation';

type Props = {
  regions: Region[]; stations: Station[]; camera: OrbitCamera; english: boolean;
  dock: 'top' | 'bottom'; side: 'left' | 'right';
  jump: (region: Region, stage: ZoomStage) => void;
};
export function ZoomKnowledge({regions, stations, camera, english, dock, side, jump}: Props) {
  const resolved = zoomKnowledge(regions, camera);
  const [content, setContent] = useState(resolved);
  const contentKey = (resolved.region?.slug ?? '') + '/' + (resolved.stage?.id ?? '');
  // Let a fast gesture skip straight to its final topic and avoid repeated announcements at a boundary.
  const latest = useRef(resolved);
  latest.current = resolved;
  useEffect(() => {
    const timer = setTimeout(() => setContent(latest.current), 180);
    return () => clearTimeout(timer);
  }, [contentKey]);
  const [offset, setOffset] = useState({x: 0, y: 0});
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{x: number; y: number; startX: number; startY: number; box: DOMRect} | null>(null);
  const {region, stage, stages} = content;
  const station = stations.find(s => s.slug === stage?.station_slug && s.region_slug === region?.slug);
  const photo = station?.explorer_data.media;
  const t = (de: string, en?: string) => english && en ? en : de;
  const questions = region && stages.length ? stages.map(stage => ({stage,destination:region})) :
    regions.flatMap(destination => validStages(destination).map(stage => ({stage,destination})));
  function move(dx: number, dy: number) {
    const start = drag.current;
    if (!start) return;
    const x = Math.max(12-start.box.left, Math.min(innerWidth-12-start.box.right, dx));
    const y = Math.max(68-start.box.top, Math.min(innerHeight-55-start.box.bottom, dy));
    setOffset({x: start.startX+x, y: start.startY+y});
  }
  return <div ref={panel} role="complementary" aria-label={t('Wissen zum Zoom', 'Zoom knowledge')}
    className="nature-orbit__story" data-dock={dock} data-side={side}
    style={{'--knowledge-x': offset.x+'px', '--knowledge-y': offset.y+'px'} as CSSProperties}>
    <div className="zoom-knowledge">
      <div className="zoom-knowledge__handle" tabIndex={0} role="button"
        aria-label={t('Infobereich verschieben. Ziehen oder Pfeiltasten, Escape setzt zurück.', 'Move information panel. Drag or use arrow keys. Escape resets.')}
        onPointerDown={e => {
          drag.current = {x:e.clientX,y:e.clientY,startX:offset.x,startY:offset.y,box:panel.current!.getBoundingClientRect()};
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={e => {if (drag.current) move(e.clientX-drag.current.x,e.clientY-drag.current.y);}}
        onPointerUp={() => {drag.current = null;}}
        onPointerCancel={() => {drag.current = null;}}
        onKeyDown={e => {
          const delta = {ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]}[e.key];
          if (['Escape','Enter',' '].includes(e.key)) {e.preventDefault();setOffset({x:0,y:0});}
          if (delta) {
            e.preventDefault();
            drag.current={x:0,y:0,startX:offset.x,startY:offset.y,box:panel.current!.getBoundingClientRect()};
            move(delta[0],delta[1]);drag.current=null;
          }
        }}>
        <span>{stage ? t(stage.label_de,stage.label_en) : t('Entdecken','Explore')}</span>
        <span aria-hidden="true">⠿</span>
      </div>
      <div aria-live="polite" aria-atomic="true" className="zoom-knowledge__answer">
        <h2>{stage ? t(stage.question_de,stage.question_en) : t('Was möchtest du verstehen?','What would you like to understand?')}</h2>
        <p>{stage ? t(stage.answer_de,stage.answer_en) : t('Tippe einen Standort an und erkunde seine Zusammenhänge.','Tap a site to explore its connections.')}</p>
        {station?.explorer_data.depth_cm && <p>{station.explorer_data.plot_id} · {station.explorer_data.depth_cm.join('–')} cm · pH {station.explorer_data.ph}</p>}
      </div>
      {photo && /^\/nature\/[\w-]+\.webp$/.test(photo.path) && <figure className="zoom-knowledge__photo">
        <img src={photo.path} alt={t(photo.caption_de,photo.caption_en)} />
        <figcaption>{t(photo.caption_de,photo.caption_en)} · <a href={photo.source}>{photo.credit}</a> · <a href={photo.license_url}>{photo.license}</a> · WebP</figcaption>
      </figure>}
      <nav className="zoom-knowledge__jumps" aria-label={t('Wissenssprünge','Knowledge jumps')}>
        {questions.map(({stage:s,destination}) => {
          return <a key={destination.slug+'/'+s.id}
            href={'?region='+destination.slug+'&level='+s.id}
            aria-current={stage?.id===s.id && region?.slug===destination.slug ? 'step' : undefined}
            title={t(s.question_de,s.question_en)}
            onClick={e => {e.preventDefault();setOffset({x:0,y:0});jump(destination,s);}}>
            {t(s.label_de,s.label_en)}</a>;
        })}
      </nav>
      <div className="nature-orbit__credits">
        {stage?.source_citations.filter(s => /^https:\/\//.test(s.url)).map(s => <a key={s.url} href={s.url}>{s.label} ↗</a>)}
      </div>
      {station?.related_paths.filter(isShopLearningPath).map(path => <Link key={path} to={(english?'/en':'')+path}>
        {t('Eigene Mischung planen','Plan your mix')} ↗</Link>)}
    </div>
  </div>;
}
