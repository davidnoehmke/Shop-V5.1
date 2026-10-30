import {useEffect, useRef, useState} from 'react';
import type {PointerEvent as ReactPointerEvent} from 'react';
import {Link} from 'react-router';

type V = [number, number, number];
type RGB = [number, number, number];
type Box = {x:number;y:number;z:number;w:number;h:number;d:number;color:RGB};
type View = {yaw:number; pitch:number; distance:number};
type Zone = {id:string;title:string;copy:string;href:string;cta:string;view:View};
const PANORAMA = 'https://cdn.shopify.com/s/files/1/0949/8876/3521/files/interieur-solution-pflanzenraum-panorama.png?v=1790445342';
export const ZONES:Zone[]=[
  {id:'overview',title:'Raumübersicht',copy:'Starte mit deinem Raum und entdecke passende Pflanzenlösungen. Die Vorschau zeigt eine beispielhafte Einrichtung ohne verbindliche Maße.',href:'/collections/interieur-solutions',cta:'Interieur-Lösungen ansehen',view:{yaw:.9,pitch:.47,distance:10}},
  {id:'plants',title:'Pflanzen',copy:'Plane die Standorte deiner Zimmerpflanzen und kombiniere sie mit geeigneten Gefäßen, Licht und Substrat.',href:'/collections/zimmerpflanzen-1',cta:'Zimmerpflanzen entdecken',view:{yaw:1.8,pitch:.35,distance:7.5}},
  {id:'planters',title:'Pflanzgefäße',copy:'Entdecke Gefäße als Gestaltungselement und achte auf passende Abmessungen, Entwässerung und Pflege.',href:'/collections/pflanzgefasse',cta:'Pflanzgefäße ansehen',view:{yaw:2.1,pitch:.25,distance:7}},
  {id:'light',title:'Pflanzenbeleuchtung',copy:'Untersuche mögliche Lichtpositionen. Eine belastbare PPFD- oder Reichweitenberechnung erfordert geprüfte Leuchtmitteldaten.',href:'/pflanzenlicht-vergleich',cta:'Zwei Leuchtmittel vergleichen',view:{yaw:-.5,pitch:.55,distance:7}},
  {id:'terrarium',title:'Terrarium',copy:'Kombiniere Gefäß, Substrat und Beleuchtung passend zum geplanten Mikroklima.',href:'/collections/interieur-solutions',cta:'Passende Lösungen entdecken',view:{yaw:-1.4,pitch:.38,distance:8}},
  {id:'vertical',title:'Vertikale Begrünung',copy:'Denke Wandflächen, Rankhilfen und Beleuchtung gemeinsam – ohne zusätzliche Wege durch komplizierte Menüs.',href:'/collections/pflanzenzubehor-rankhilfen',cta:'Rankhilfen ansehen',view:{yaw:-2.2,pitch:.32,distance:8}},
];

const normal=(a:V):V=>{const n=Math.hypot(...a)||1;return[a[0]/n,a[1]/n,a[2]/n];};
const cross=(a:V,b:V):V=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a:V,b:V)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function roomObjects(plants:number,lamps:number):Box[]{
  const out:Box[]=[
    {x:0,y:-.08,z:0,w:6.8,h:.16,d:5.7,color:[.74,.68,.58]},
    {x:-3.38,y:1.5,z:0,w:.12,h:3,d:5.7,color:[.74,.81,.7]},
    {x:0,y:1.5,z:-2.78,w:6.8,h:3,d:.12,color:[.9,.88,.77]},
    {x:-1.25,y:1.5,z:-2.7,w:1.7,h:1.8,d:.08,color:[.73,.82,.79]},
    {x:-1.25,y:1.5,z:-2.63,w:.045,h:1.75,d:.1,color:[.96,.96,.9]},
    {x:-1.25,y:1.5,z:-2.63,w:1.6,h:.045,d:.1,color:[.96,.96,.9]},
    {x:1.75,y:.55,z:-1.75,w:2.2,h:.095,d:.62,color:[.39,.32,.26]},
    {x:1.75,y:1.22,z:-1.75,w:2.2,h:.095,d:.62,color:[.39,.32,.26]},
    {x:1.75,y:1.92,z:-1.75,w:2.2,h:.095,d:.62,color:[.39,.32,.26]},
    {x:1,y:1,z:-1.95,w:.06,h:2,d:.06,color:[.28,.3,.27]},
    {x:2.5,y:1,z:-1.95,w:.06,h:2,d:.06,color:[.28,.3,.27]},
    {x:2.55,y:1,z:-1.45,w:.06,h:2,d:.06,color:[.28,.3,.27]},
    {x:1,y:1,z:-1.45,w:.06,h:2,d:.06,color:[.28,.3,.27]},
    {x:-.1,y:.35,z:1,w:1.7,h:.7,d:.85,color:[.7,.66,.59]},
  ];
  const locations:[number,number,number][]=[[-2,0,1.15],[-2,0,-1.5],[1.35,1.22,-1.75],[2,1.92,-1.75],[2.1,0,1.1],[-.4,0,-1.2]];
  for(let i=0;i<Math.min(plants,locations.length);i++){
    const [x,y,z]=locations[i];
    out.push({x,y:y+.22,z,w:.42,h:.44,d:.42,color:[.53,.38,.29]});
    out.push({x,y:y+.55,z,w:.08,h:.45,d:.08,color:[.26,.42,.28]});
    const leaves=5;
    for(let j=0;j<leaves;j++){
      const t=j*Math.PI*2/leaves;
      out.push({x:x+Math.sin(t)*.22,y:y+.75+(j%2)*.13,z:z+Math.cos(t)*.22,w:.33,h:.09,d:.24,color:[.22+(j%2)*.08,.44+(j%2)*.07,.27]});
    }
  }
  for(let i=0;i<Math.min(lamps,3);i++){
    const x=-1.7+i*1.55;
    out.push({x,y:2.8,z:-.5,w:.055,h:.4,d:.055,color:[.27,.31,.29]});
    out.push({x,y:2.58,z:-.5,w:.7,h:.11,d:.45,color:[.92,.82,.52]});
  }
  return out;
}
function drawRoom(canvas:HTMLCanvasElement,view:View,plants:number,lamps:number){
  const gl=canvas.getContext('webgl',{antialias:true,alpha:false,powerPreference:'low-power'});
  if(!gl)return false;
  const ratio=Math.min(window.devicePixelRatio||1,1.7);
  const width=Math.max(1,Math.floor(Math.min(1400,canvas.clientWidth*ratio)));
  const height=Math.max(1,Math.floor(Math.min(1000,canvas.clientHeight*ratio)));
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  gl.viewport(0,0,width,height);gl.enable(gl.DEPTH_TEST);gl.clearColor(.955,.952,.92,1);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const eye:V=[Math.sin(view.yaw)*Math.cos(view.pitch)*view.distance,1.35+Math.sin(view.pitch)*view.distance,Math.cos(view.yaw)*Math.cos(view.pitch)*view.distance];
  const center:V=[0,1.05,0];
  const backwards=normal([eye[0]-center[0],eye[1]-center[1],eye[2]-center[2]]);
  const right=normal(cross([0,1,0],backwards)),up=cross(backwards,right);
  const f=1/Math.tan(Math.PI/5.5),aspect=width/height,near=.1,far=80;
  const point=(p:V):[number,number,number,number]=>{
    const diff:V=[p[0]-eye[0],p[1]-eye[1],p[2]-eye[2]];
    const xx=dot(diff,right),yy=dot(diff,up),zz=dot(diff,backwards);
    return [f*xx/aspect,f*yy,((far+near)/(near-far))*zz+(2*far*near)/(near-far),-zz];
  };
  const faces=[{idx:[0,1,2,3],shade:.79},{idx:[5,4,7,6],shade:.86},{idx:[4,0,3,7],shade:.62},{idx:[1,5,6,2],shade:.76},{idx:[3,2,6,7],shade:1.08},{idx:[4,5,1,0],shade:.65}];
  const arr:number[]=[];
  for(const b of roomObjects(plants,lamps)){
    const c=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(([a,d,e])=>point([b.x+a*b.w/2,b.y+d*b.h/2,b.z+e*b.d/2]));
    for(const face of faces)for(const i of [0,1,2,0,2,3]){
      arr.push(...c[face.idx[i]],...b.color.map(value=>Math.min(1,value*face.shade)));
    }
  }
  const vertex=gl.createShader(gl.VERTEX_SHADER)!,frag=gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(vertex,'attribute vec4 aPosition;attribute vec3 aColor;varying vec3 vColor;void main(){gl_Position=aPosition;vColor=aColor;}');
  gl.shaderSource(frag,'precision mediump float;varying vec3 vColor;void main(){gl_FragColor=vec4(vColor,1.);}');
  gl.compileShader(vertex);gl.compileShader(frag);
  if(!gl.getShaderParameter(vertex,gl.COMPILE_STATUS)||!gl.getShaderParameter(frag,gl.COMPILE_STATUS)){gl.deleteShader(vertex);gl.deleteShader(frag);return false;}
  const program=gl.createProgram()!;gl.attachShader(program,vertex);gl.attachShader(program,frag);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);gl.deleteShader(vertex);gl.deleteShader(frag);return false;}
  const buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.STATIC_DRAW);gl.useProgram(program);
  const pos=gl.getAttribLocation(program,'aPosition'),color=gl.getAttribLocation(program,'aColor');
  gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,4,gl.FLOAT,false,28,0);
  gl.enableVertexAttribArray(color);gl.vertexAttribPointer(color,3,gl.FLOAT,false,28,16);
  gl.drawArrays(gl.TRIANGLES,0,arr.length/7);
  gl.deleteBuffer(buffer);gl.deleteShader(vertex);gl.deleteShader(frag);gl.deleteProgram(program);
  return true;
}

export function RoomPlanner3D({locale='de'}:{locale?:'de'|'en'}){
  const canvas=useRef<HTMLCanvasElement>(null);
  const drag=useRef<{x:number;y:number}|null>(null);
  const [active,setActive]=useState(0);
  const [camera,setCamera]=useState<View>(ZONES[0].view);
  const [plants,setPlants]=useState(4);
  const [lamps,setLamps]=useState(2);
  const [ready,setReady]=useState(false);
  const [fallback,setFallback]=useState(false);
  const isEnglish=locale==='en';
  useEffect(()=>{
    const node=canvas.current;if(!node)return;
    const render=()=>{try{if(drawRoom(node,camera,plants,lamps))setReady(true);else setFallback(true);}catch{setFallback(true);}};
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))render();},{rootMargin:'100px'});
    observer.observe(node);
    const resize=typeof ResizeObserver!=='undefined'?new ResizeObserver(render):null;
    resize?.observe(node);
    return()=>{observer.disconnect();resize?.disconnect();};
  },[camera,plants,lamps]);
  const zone=ZONES[active];
  function select(i:number){setActive(i);setCamera(ZONES[i].view);}
  function pointerDown(e:ReactPointerEvent<HTMLCanvasElement>){drag.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}
  function pointerMove(e:ReactPointerEvent<HTMLCanvasElement>){
    if(!drag.current)return;const dx=e.clientX-drag.current.x,dy=e.clientY-drag.current.y;drag.current={x:e.clientX,y:e.clientY};
    setCamera(v=>({...v,yaw:v.yaw-dx*.008,pitch:Math.max(-.15,Math.min(1.3,v.pitch-dy*.006))}));
  }
  return <main className="page-shell leaf-room" id="room-planner">
    <header className="leaf-room__hero">
      <p className="page-eyebrow">LEAF Studio · {isEnglish?'3D room planning':'Interaktive 3D-Raumplanung'}</p>
      <h1>{isEnglish?'Shape your green interior.':'Gestalte deinen Pflanzenraum.'}</h1>
      <p>{isEnglish?'Explore six zones in a real 3D scene. This is an illustrative preview, not a precise lighting or room measurement.':'Erkunde sechs Erlebniszonen in einer interaktiven 3D-Szene. Die Darstellung ist eine Gestaltungs-Vorschau, keine maßstabsgetreue Raum- oder Lichtberechnung.'}</p>
    </header>
    <div className="leaf-room__layout">
      <section className="leaf-room__stage" aria-label="3D-Raumansicht">
        {!ready||fallback?<img src={PANORAMA} alt="Pflanzenraum als Panorama – alternative Ansicht ohne 3D" loading="eager" className="leaf-room__poster"/>:null}
        <canvas ref={canvas} className={ready&&!fallback?'is-ready':''} role="img" aria-label="Drehbare 3D-Raumansicht" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}/>
        <p className="leaf-room__stage-note">3D-Entwurf · Objekte und Proportionen symbolisch</p>
      </section>
      <section className="leaf-room__details" aria-live="polite">
        <p className="page-eyebrow">{active+1} / 6</p>
        <h2>{zone.title}</h2>
        <p>{zone.copy}</p>
        <Link to={zone.href} prefetch="intent">{zone.cta} →</Link>
        <div className="leaf-room__settings">
          <label>{isEnglish?'Plants':'Pflanzen'}: {plants}<input type="range" min="0" max="6" value={plants} onChange={e=>setPlants(Number(e.target.value))}/></label>
          <label>{isEnglish?'Lights':'Lichtmodule'}: {lamps}<input type="range" min="0" max="3" value={lamps} onChange={e=>setLamps(Number(e.target.value))}/></label>
        </div>
      </section>
    </div>
    <nav className="leaf-room__zones" aria-label={isEnglish?'Six planning zones':'Sechs Planungsbereiche'}>
      {ZONES.map((item,i)=><button type="button" key={item.id} aria-current={i===active?'step':undefined} onClick={()=>select(i)}><span>{String(i+1).padStart(2,'0')}</span><strong>{item.title}</strong></button>)}
    </nav>
    <p className="leaf-room__footer">Die Szene verwendet beispielhafte Objekte. Ein verbindliches, direkt bestellbares Raum-Setup erfordert später geprüfte Produktabmessungen und Varianten aus Shopify.</p>
  </main>;
}
