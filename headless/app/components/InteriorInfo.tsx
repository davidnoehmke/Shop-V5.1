import {useId, useState} from 'react';
import {Link} from 'react-router';
import {INTERIOR_INFO} from '~/lib/interior-info';
const PANORAMA='https://cdn.shopify.com/s/files/1/0949/8876/3521/files/interieur-solution-pflanzenraum-panorama.png?v=1790445342';
/** Informational article media; deliberately independent of the room configurator. */
export function InteriorInfo({locale}:{locale:'de'|'en'}){
  const [active,setActive]=useState(0);
  const points=INTERIOR_INFO[locale],point=points[active],english=locale==='en',panelId=useId();
  return <section className="leaf-interior-info" aria-label={english?'Six views of the plant interior':'Sechs Blickwinkel auf den Pflanzenraum'}>
    <div className="leaf-interior-info__image">
      <img src={PANORAMA} alt={english?'Plant interior with plants, planters, lighting, terrarium and vertical planting':'Pflanzenraum mit Pflanzen, Gefäßen, Licht, Terrarium und vertikaler Begrünung'}
        className={active===0?'':'is-focused'} style={{transformOrigin:`${point.x}% ${point.y}%`}} width={1800} height={1000} decoding="async"/>
      {points.map((item,i)=><button key={item.id} type="button" className="leaf-interior-info__point"
        style={{left:`${item.x}%`,top:`${item.y}%`}} aria-label={`${String(i).padStart(2,'0')} · ${item.label}`}
        aria-pressed={active===i} aria-controls={panelId} onClick={()=>setActive(i)}>{String(i).padStart(2,'0')}</button>)}
    </div>
    <div className="leaf-interior-info__panel" id={panelId} aria-live="polite" aria-atomic="true">
      <p className="page-eyebrow">{active+1} / 6 · {point.label}</p><h2>{point.title}</h2><p>{point.copy}</p>
      <Link to={point.href} prefetch="intent">{point.cta} →</Link>
      <div className="leaf-interior-info__controls"><button type="button" disabled={active===0} onClick={()=>setActive(i=>i-1)}>{english?'Previous':'Zurück'}</button><button type="button" disabled={active===5} onClick={()=>setActive(i=>i+1)}>{english?'Next':'Weiter'}</button></div>
    </div>
  </section>;
}
