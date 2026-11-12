import {useMemo, useState} from 'react';
import {Image, Money} from '@shopify/hydrogen';
import {Link, useLoaderData} from 'react-router';
import type {CurrencyCode} from '@shopify/hydrogen/storefront-api-types';
import type {Route} from './+types/pflanzenlicht-vergleich';

type Field={value:string}|null;
type Product={
  id:string;handle:string;title:string;vendor:string;availableForSale:boolean;
  featuredImage?:{id:string;url:string;altText:string|null;width:number|null;height:number|null}|null;
  priceRange:{minVariantPrice:{amount:string;currencyCode:CurrencyCode}};
  watts?:Field;ppf?:Field;beam?:Field;distance?:Field;socket?:Field;cct?:Field;
};
type QueryResult={products:{nodes:Product[]}};

export const meta:Route.MetaFunction=()=>[
  {title:'Pflanzenlampen vergleichen | LEAFerservice'},
  {name:'description',content:'Zwei echte Pflanzenlampen vergleichen: Watt, PPF, Abstrahlwinkel, Abstand, Preis und Verfügbarkeit, sofern Herstellerangaben verifiziert und im Katalog verfügbar sind.'},
];
export async function loader({context}:Route.LoaderArgs){
  const data=await context.storefront.query<QueryResult>(LIGHT_QUERY,{cache:context.storefront.CacheShort()});
  return {products:data.products.nodes};
}
function textField(p:Product|null,key:keyof Product){
  const f=p?.[key];
  return f&&typeof f==='object'&&'value' in f&&typeof f.value==='string'&&f.value.trim()?f.value.trim():'Keine Angabe';
}
function numberField(p:Product|null,key:'watts'|'ppf'){
  const raw=p?.[key]?.value;
  if(!raw||!/^[0-9]+(?:[.,][0-9]+)?$/.test(raw.trim()))return null;
  const value=Number(raw.replace(',','.'));
  return Number.isFinite(value)&&value>=0?value:null;
}
function LampCard({product,label}:{product:Product|null;label:string}){
  if(!product)return <div className="leaf-compare__empty">Kein vergleichbares Produkt verfügbar.</div>;
  return <article className="leaf-compare__product">
    <p className="page-eyebrow">{label}</p>
    <Link to={`/products/${product.handle}`} prefetch="intent" aria-label={`${product.title} ansehen`}>
      <div className="leaf-compare__image">
        {product.featuredImage?<Image data={product.featuredImage} sizes="(max-width: 720px) 45vw, 25vw" loading="lazy"/>:<span>Produktbild derzeit nicht verfügbar</span>}
      </div>
      <h3>{product.title}</h3>
    </Link>
    <p>{product.vendor}</p>
    <strong><Money data={product.priceRange.minVariantPrice}/></strong>
    <p>{product.availableForSale?'Im Shop bestellbar':'Aktuell nicht bestellbar'}</p>
    <Link className="leaf-compare__cta" to={`/products/${product.handle}`}>Produkt ansehen →</Link>
  </article>;
}
function NumericComparison({label,left,right,field,unit}:{label:string;left:Product|null;right:Product|null;field:'watts'|'ppf';unit:string}){
  const a=numberField(left,field),b=numberField(right,field),maximum=Math.max(a??0,b??0,1);
  return <div className="leaf-compare__fact leaf-compare__fact--numeric">
    <span>{label}</span>
    {[a,b].map((n,i)=><div key={i} className="leaf-compare__numeric">
      <strong>{n===null?'Keine Angabe':`${new Intl.NumberFormat('de-DE').format(n)} ${unit}`}</strong>
      {a!==null&&b!==null?<meter min={0} max={maximum} value={n??0} aria-label={`${label}: ${n} ${unit}`}/>:null}
    </div>)}
  </div>;
}
export default function LightComparison(){
  const {products}=useLoaderData<typeof loader>();
  const [leftId,setLeftId]=useState(products[0]?.id||'');
  const [rightId,setRightId]=useState(products[1]?.id||products[0]?.id||'');
  const left=useMemo(()=>products.find(x=>x.id===leftId)||null,[products,leftId]);
  const right=useMemo(()=>products.find(x=>x.id===rightId)||null,[products,rightId]);
  const money=(p:Product|null)=>p?new Intl.NumberFormat('de-DE',{style:'currency',currency:p.priceRange.minVariantPrice.currencyCode}).format(Number(p.priceRange.minVariantPrice.amount)):'–';
  return <main className="page-shell leaf-compare">
    <header className="leaf-compare__header">
      <p className="page-eyebrow">Pflanzenlicht · Entscheidungshilfe</p>
      <h1>Zwei Leuchtmittel. Ein klarer Vergleich.</h1>
      <p className="page-lead">Wähle zwei Modelle und vergleiche Preise sowie tatsächlich hinterlegte technische Herstellerdaten. Kein Ranking ohne nachvollziehbare Werte, keine Werbe-Pop-ups.</p>
    </header>
    {products.length?<>
      <div className="leaf-compare__selectors">
        <label>Leuchtmittel A<select value={leftId} onChange={e=>setLeftId(e.target.value)}>{products.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
        <label>Leuchtmittel B<select value={rightId} onChange={e=>setRightId(e.target.value)}>{products.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
      </div>
      {leftId===rightId?<p className="leaf-compare__hint" role="status">Wähle zwei unterschiedliche Modelle, um Unterschiede besser zu erkennen.</p>:null}
      <div className="leaf-compare__grid">
        <LampCard product={left} label="A · Erstes Produkt"/>
        <LampCard product={right} label="B · Zweites Produkt"/>
      </div>
      <section className="leaf-compare__facts" aria-label="Direkter Produktvergleich">
        <h2>Direkt gegenübergestellt</h2>
        <div className="leaf-compare__fact"><span>Preis ab</span><strong>{money(left)}</strong><strong>{money(right)}</strong></div>
        <div className="leaf-compare__fact"><span>Marke</span><strong>{left?.vendor||'–'}</strong><strong>{right?.vendor||'–'}</strong></div>
        <div className="leaf-compare__fact"><span>Bestellbarkeit</span><strong>{left?.availableForSale?'Ja':'Nein'}</strong><strong>{right?.availableForSale?'Ja':'Nein'}</strong></div>
        <NumericComparison label="Nennleistung" left={left} right={right} field="watts" unit="W"/>
        <NumericComparison label="Photonenfluss (PPF)" left={left} right={right} field="ppf" unit="µmol/s"/>
        <div className="leaf-compare__fact"><span>Abstrahlwinkel</span><strong>{textField(left,'beam')}</strong><strong>{textField(right,'beam')}</strong></div>
        <div className="leaf-compare__fact"><span>Hersteller-Abstand</span><strong>{textField(left,'distance')}</strong><strong>{textField(right,'distance')}</strong></div>
        <div className="leaf-compare__fact"><span>Sockel / Anschluss</span><strong>{textField(left,'socket')}</strong><strong>{textField(right,'socket')}</strong></div>
        <div className="leaf-compare__fact"><span>Farbtemperatur</span><strong>{textField(left,'cct')}</strong><strong>{textField(right,'cct')}</strong></div>
        <p>Grafische Balken vergleichen ausschließlich die beiden hinterlegten Messwerte, keine Qualität oder Eignung. PPF ist nicht PPFD am Blatt: Abstand, Optik und Messbedingungen verändern die tatsächliche Beleuchtung. Fehlende Daten werden nicht geschätzt. Preis und Verfügbarkeit können sich bis zum Checkout ändern.</p>
      </section>
    </>:<div className="leaf-compare__empty"><h2>Momentan keine geeigneten Produkte gefunden.</h2><p>Bitte nutze die Produktsuche, bis der Katalog für den direkten Vergleich vollständig verfügbar ist.</p><Link to="/search?q=LED">Pflanzenlampen suchen →</Link></div>}
  </main>;
}
const LIGHT_QUERY=`#graphql
  query LeafLightCompare($country:CountryCode,$language:LanguageCode)
  @inContext(country:$country,language:$language) {
    products(first:60,query:"LED") {
      nodes {
        id handle title vendor availableForSale
        featuredImage { id url altText width height }
        priceRange { minVariantPrice { amount currencyCode } }
        watts: metafield(namespace:"lighting",key:"rated_power_w") { value }
        ppf: metafield(namespace:"lighting",key:"ppf_umol_s") { value }
        beam: metafield(namespace:"lighting",key:"beam_angle") { value }
        distance: metafield(namespace:"lighting",key:"recommended_distance") { value }
        socket: metafield(namespace:"lighting",key:"socket_connector") { value }
        cct: metafield(namespace:"lighting",key:"cct_k") { value }
      }
    }
  }
` as const;
