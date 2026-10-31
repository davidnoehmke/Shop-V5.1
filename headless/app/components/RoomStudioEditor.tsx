import {useCallback, useEffect, useRef, useState} from 'react';

type Kind = 'planter'|'light'|'system';
export type CatalogItem={id:string;title:string;handle:string;vendor:string;kind:Kind;width:number|null;depth:number|null;image?:string|null};
type Item = {id:string;kind:Kind;x:number;y:number;rotation:number;width:number;depth:number;productId?:string};
type Plan = {width:number;depth:number;height:number;items:Item[]};
const labels:Record<Kind,string>={planter:'Pflanzgefäß',light:'LED-Leuchte',system:'Interieur-System'};
const sizes:Record<Kind,[number,number]>={planter:[0.45,0.45],light:[0.25,0.25],system:[1.2,0.45]};
const initial:Plan={width:4.5,depth:3.6,height:2.5,items:[]};
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const valid=(n:number)=>Number.isFinite(n)&&n>0.5&&n<=30;
function corners(i:Item){const angle=i.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);return [[-i.width/2,-i.depth/2],[i.width/2,-i.depth/2],[i.width/2,i.depth/2],[-i.width/2,i.depth/2]].map(([x,y])=>({x:i.x+x*c-y*s,y:i.y+x*s+y*c}));}
function overlap(a:Item,b:Item){const A=corners(a),B=corners(b);const axes=[...Array.from({length:4},(_,i)=>{const p=A[i],q=A[(i+1)%4];return {x:q.y-p.y,y:p.x-q.x};}),...Array.from({length:4},(_,i)=>{const p=B[i],q=B[(i+1)%4];return {x:q.y-p.y,y:p.x-q.x};})];return axes.every(axis=>{const project=(points:{x:number;y:number}[])=>points.map(p=>p.x*axis.x+p.y*axis.y);const pa=project(A),pb=project(B);return Math.max(...pa)>Math.min(...pb)+1e-7&&Math.max(...pb)>Math.min(...pa)+1e-7;});}
function bounds(item:Item,plan:Plan){return corners(item).every(p=>p.x>=0&&p.x<=plan.width&&p.y>=0&&p.y<=plan.depth);}
function validate(p:Plan){return p.items.flatMap(item=>{const issues=[];if(!bounds(item,p))issues.push(item.id+': außerhalb des Raums');if(p.items.some(other=>other.id!==item.id&&overlap(item,other)))issues.push(item.id+': Überschneidung');return issues;});}
export function RoomStudioEditor({catalog=[]}:{catalog?:CatalogItem[]}){
  const [plan,setPlan]=useState<Plan>(initial);
  const [selected,setSelected]=useState<string|null>(null);
  const [view,setView]=useState<'2d'|'3d'>('2d');
  const [snap,setSnap]=useState(true);
  const [photo,setPhoto]=useState<string|null>(null);
  const [history,setHistory]=useState<Plan[]>([]);
  const [future,setFuture]=useState<Plan[]>([]);
  const stage=useRef<SVGSVGElement>(null);
  const importRef=useRef<HTMLInputElement>(null);
  const drag=useRef<{id:string;start:Plan}|null>(null);
  const [notice,setNotice]=useState('');
  const [catalogId,setCatalogId]=useState('');
  
  const commit=useCallback((next:Plan)=>{setPlan(prev=>{setHistory(h=>[...h.slice(-39),prev]);setFuture([]);return next;});},[]);
  const selectedItem=plan.items.find(i=>i.id===selected);
  const add=(kind:Kind)=>{const [width,depth]=sizes[kind];const id=typeof crypto!=='undefined'&&'randomUUID'in crypto?crypto.randomUUID():String(Date.now())+Math.random();commit({...plan,items:[...plan.items,{id,kind,width,depth,x:plan.width/2,y:plan.depth/2,rotation:0}]});setSelected(id);};
  const edit=(id:string,change:Partial<Item>)=>commit({...plan,items:plan.items.map(i=>i.id===id?{...i,...change}:i)});
  const point=(e:React.PointerEvent<SVGSVGElement>)=>{const svg=stage.current;if(!svg)return null;const ctm=svg.getScreenCTM();if(!ctm)return null;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(ctm.inverse());return {x:clamp(p.x/100,0,plan.width),y:clamp(p.y/100,0,plan.depth)};};
  const pointerDown=(e:React.PointerEvent<SVGSVGElement>,id:string)=>{if(view!=='2d')return;const node=stage.current;if(!node)return;drag.current={id,start:plan};setSelected(id);node.setPointerCapture(e.pointerId);e.preventDefault();};
  const pointerMove=(e:React.PointerEvent<SVGSVGElement>)=>{if(!drag.current)return;const p=point(e);if(!p)return;const id=drag.current.id;setPlan(prev=>({...prev,items:prev.items.map(i=>i.id===id?{...i,x:snap?Math.round(p.x*20)/20:p.x,y:snap?Math.round(p.y*20)/20:p.y}:i)}));};
  const pointerUp=()=>{if(drag.current){setHistory(h=>[...h.slice(-39),drag.current!.start]);setFuture([]);drag.current=null;}};
  const undo=()=>{if(!history.length)return;setFuture(f=>[plan,...f]);setPlan(history[history.length-1]);setHistory(h=>h.slice(0,-1));};
  const redo=()=>{if(!future.length)return;setHistory(h=>[...h,plan]);setPlan(future[0]);setFuture(f=>f.slice(1));};
  const addCatalog=()=>{const product=catalog.find(p=>p.id===catalogId);if(!product)return;const width=product.width??sizes[product.kind][0],depth=product.depth??sizes[product.kind][1];const id=String(Date.now())+Math.random();commit({...plan,items:[...plan.items,{id,kind:product.kind,productId:product.id,width,depth,x:plan.width/2,y:plan.depth/2,rotation:0}]});setSelected(id);setNotice(product.width&&product.depth?'Herstellermaße aus Katalog verwendet.':'Maße fehlen: vorläufige Platzhalter, bitte manuell korrigieren.');};
  const exportPlan=()=>{const blob=new Blob([JSON.stringify({version:1,plan,accuracy:'manual-estimate'},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='leaf-room-plan.json';a.click();URL.revokeObjectURL(url);};
  const importPlan=(e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;if(file.size>1024*1024){setNotice('Plan-Datei ist zu groß.');return;}file.text().then(raw=>{try{const parsed=JSON.parse(raw);const p=parsed.plan as Plan;if(!p||!valid(p.width)||!valid(p.depth)||!valid(p.height)||!Array.isArray(p.items)||p.items.length>200||!p.items.every(i=>i&&typeof i.id==='string'&&['planter','light','system'].includes(i.kind)&&[i.x,i.y,i.width,i.depth,i.rotation].every(Number.isFinite)&&i.width>0&&i.depth>0&&i.width<=30&&i.depth<=30)){throw Error('invalid');}commit({width:p.width,depth:p.depth,height:p.height,items:p.items.map(i=>({id:i.id,kind:i.kind,x:i.x,y:i.y,width:i.width,depth:i.depth,rotation:i.rotation,productId:typeof i.productId==='string'?i.productId:undefined}))});setSelected(null);setNotice('Raumplan erfolgreich importiert.');}catch{setNotice('Ungültige Raumplan-Datei.');}}).catch(()=>setNotice('Raumplan konnte nicht gelesen werden.'));e.target.value='';};
  const onPhoto=(e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith('image/')||file.size>8*1024*1024){setNotice('Bitte ein Bild bis 8 MB wählen.');return;}const reader=new FileReader();reader.onload=()=>{setPhoto(String(reader.result));setNotice('Foto geladen. Bitte Raummaße manuell bestätigen; ein Foto allein liefert keine verlässlichen Maße.');};reader.readAsDataURL(file);};
  const warnings=validate(plan);
  useEffect(()=>()=>{drag.current=null;},[]);
  return <main className="page-shell" style={{maxWidth:1280,margin:'auto',padding:'32px 20px'}}>
    <p className="page-eyebrow">LEAF Studio / Raumplanung</p><h1>Deinen Pflanzenraum planen.</h1>
    <p>Raummaße erfassen, Objekte maßstäblich platzieren und den Entwurf speichern. Die 3D-Ansicht ist eine schematische Vorschau; keine Lichtberechnung.</p>
    <section style={{display:'flex',gap:12,flexWrap:'wrap',margin:'24px 0'}}>
      {([['width','Breite'],['depth','Tiefe'],['height','Höhe']] as const).map(([key,label])=><label key={key} style={{display:'grid',gap:4}}>{label} (m)<input aria-label={label+' in Metern'} type="number" min=".6" max="30" step=".1" value={plan[key]} onChange={e=>{const n=Number(e.target.value);if(valid(n))commit({...plan,[key]:n});}} style={{width:110,padding:9}}/></label>)}
      <label style={{display:'grid',gap:4}}>Raumfoto (optional)<input type="file" accept="image/*" onChange={onPhoto}/></label>
    </section>
    {photo&&<div style={{marginBottom:12}}><img src={photo} alt="Hochgeladenes Raumfoto als visuelle Referenz" style={{maxHeight:140,maxWidth:'100%',objectFit:'contain'}}/><button type="button" onClick={()=>setPhoto(null)}>Foto entfernen</button><p>Das Foto dient nur als Referenz. Es wird nicht automatisch vermessen oder hochgeladen.</p></div>}
    <section style={{margin:'18px 0',padding:16,border:'1px solid #ccd7cc',borderRadius:12}}><h2>Shopify-Produkte platzieren</h2>{catalog.length?<><select aria-label="Produkt auswählen" value={catalogId} onChange={e=>setCatalogId(e.target.value)}><option value="">Produkt auswählen</option>{catalog.map(p=><option key={p.id} value={p.id}>{p.vendor} · {p.title}{p.width&&p.depth?' · Maße hinterlegt':' · Maße fehlen'}</option>)}</select> <button type="button" disabled={!catalogId} onClick={addCatalog}>Produkt im Raum platzieren</button></>:<p>Derzeit keine passenden Shop-Produkte gefunden. Generische Planungsobjekte bleiben verfügbar.</p>}<p style={{fontSize:13}}>Nur passende Shop-Artikel werden angezeigt. Maße werden ausschließlich übernommen, wenn sie als numerische Metafelder vorliegen.</p></section>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
      {(['planter','light','system'] as Kind[]).map(k=><button type="button" key={k} onClick={()=>add(k)}>+ {labels[k]}</button>)}
      <label style={{display:'flex',alignItems:'center',gap:5}}><input type="checkbox" checked={snap} onChange={e=>setSnap(e.target.checked)}/>5-cm-Raster</label>
      <button type="button" onClick={undo} disabled={!history.length}>Rückgängig</button><button type="button" onClick={redo} disabled={!future.length}>Wiederholen</button>
      <button type="button" onClick={()=>setView(view==='2d'?'3d':'2d')}>{view==='2d'?'3D-Vorschau':'2D-Grundriss'}</button>
      <button type="button" onClick={exportPlan}>Plan als JSON speichern</button>
      <button type="button" onClick={()=>importRef.current?.click()}>Gespeicherten Plan laden</button><input ref={importRef} type="file" accept="application/json,.json" onChange={importPlan} style={{display:'none'}}/>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,330px),1fr))',gap:20}}>
      <section aria-label="Raumplan" style={{background:'#edf0e9',borderRadius:12,padding:18,color:'#172a21'}}>
        <svg ref={stage} viewBox={`0 0 ${plan.width*100} ${plan.depth*100}`} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} style={{width:'100%',aspectRatio:`${plan.width}/${plan.depth}`,touchAction:'none',background:'#fafbf8',border:'3px solid #45604c',borderRadius:3,transform:view==='3d'?'perspective(800px) rotateX(22deg)':'none'}}>
          <defs><pattern id="room-grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="#dce3db" strokeWidth="1"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#room-grid)"/>
          <rect x={plan.width*22} y="-2" width={Math.min(100,plan.width*20)} height="7" fill="#80b8d1"/>
          {plan.items.map(item=><g key={item.id} onPointerDown={e=>pointerDown(e,item.id)} transform={`translate(${item.x*100} ${item.y*100}) rotate(${item.rotation})`} style={{cursor:'grab'}}>
            <rect x={-item.width*50} y={-item.depth*50} width={item.width*100} height={item.depth*100} rx="4" fill={item.kind==='planter'?'#527a57':item.kind==='light'?'#d8ba66':'#98836b'} stroke={selected===item.id?'#111':'#fff'} strokeWidth={selected===item.id?4:2}/>
            <text textAnchor="middle" y="4" fontSize="13" fill="#10231a" style={{pointerEvents:'none'}}>{item.kind==='planter'?'P':item.kind==='light'?'LED':'SYS'}</text>
          </g>)}
        </svg>
        <p style={{fontSize:13}}>Blau: Fenster (schematisch) · Raster: 0,5 m · Objekte antippen und ziehen</p>
        <p><strong>{plan.width.toFixed(1)} × {plan.depth.toFixed(1)} m</strong> · {plan.items.length} Elemente</p>
      </section>
      <aside style={{border:'1px solid #d0d8d0',borderRadius:12,padding:18}}>
        <h2>Objekte bearbeiten</h2>
        {selectedItem?<div style={{display:'grid',gap:12}}>
          <strong>{labels[selectedItem.kind]}</strong>
          {selectedItem.productId&&catalog.find(p=>p.id===selectedItem.productId)?<a href={'/products/'+catalog.find(p=>p.id===selectedItem.productId)!.handle}>Produkt ansehen: {catalog.find(p=>p.id===selectedItem.productId)!.title}</a>:null}
          {([['x','Position X'],['y','Position Y'],['width','Breite'],['depth','Tiefe']] as const).map(([key,label])=><label key={key}>{label} (m)<input type="number" step=".05" min="0" value={selectedItem[key]} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&n>=0)edit(selectedItem.id,{[key]:n});}} style={{display:'block',width:'100%',padding:8}}/></label>)}
          <label>Drehung (°)<input type="range" min="0" max="345" step="15" value={selectedItem.rotation} onChange={e=>edit(selectedItem.id,{rotation:Number(e.target.value)})}/>{selectedItem.rotation}°</label>
          <button type="button" onClick={()=>{const id=String(Date.now());commit({...plan,items:[...plan.items,{...selectedItem,id,x:clamp(selectedItem.x+.3,0,plan.width)}]});setSelected(id);}}>Duplizieren</button>
          <button type="button" onClick={()=>{commit({...plan,items:plan.items.filter(i=>i.id!==selectedItem.id)});setSelected(null);}}>Entfernen</button>
        </div>:<p>Objekt im Plan auswählen oder oben hinzufügen.</p>}
        <h3>Produktliste</h3><ul>{plan.items.map(item=>{const product=catalog.find(p=>p.id===item.productId);return <li key={item.id}>{product?<a href={'/products/'+product.handle}>{product.title}</a>:labels[item.kind]+' (Planungsobjekt)'}</li>;})}</ul>
        <h3>Planungsprüfung</h3>
        {warnings.length?<ul>{warnings.map((w,i)=><li key={i}>{w}</li>)}</ul>:<p>Keine offensichtlichen Überschneidungen oder Grenzverletzungen erkannt.</p>}
        <p style={{fontSize:13}}>Kollisionen und Raumgrenzen werden einschließlich der Objektrotation geprüft. Für Produkte ohne hinterlegte Maße werden Platzhalter verwendet.</p>
        {notice&&<p role="status">{notice}</p>}
      </aside>
    </div>
  </main>;
}
