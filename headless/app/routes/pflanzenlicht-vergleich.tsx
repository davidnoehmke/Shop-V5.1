import {useMemo, useState} from 'react';
import {Image, Money} from '@shopify/hydrogen';
import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/pflanzenlicht-vergleich';

type Product = {
  id:string; handle:string; title:string; vendor:string;
  featuredImage?: {id:string;url:string;altText:string|null;width:number|null;height:number|null}|null;
  priceRange:{minVariantPrice:{amount:string;currencyCode:'EUR'}};
  variants:{nodes:Array<{id:string;availableForSale:boolean}>};
};
type QueryResult={products:{nodes:Product[]}};

export const meta:Route.MetaFunction=()=>[
  {title:'Pflanzenlampen vergleichen | LEAFerservice'},
  {name:'description',content:'Vergleiche zwei echte Pflanzenlampen aus dem LEAFerservice-Sortiment direkt: Bilder, Anbieter, Preis und Verfügbarkeit. Ohne Werbung und ohne Verkaufsdruck.'},
];
export async function loader({context}:Route.LoaderArgs){
  const data=await context.storefront.query<QueryResult>(LIGHT_QUERY,{cache:context.storefront.CacheShort()});
  return {products:data.products.nodes};
}
function LampCard({product,label}:{product:Product|null;label:string}){
  if(!product)return <div className="leaf-compare__empty">Kein vergleichbares Produkt verfügbar.</div>;
  const available=product.variants.nodes.some(v=>v.availableForSale);
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
    <p>{available?'Im Shop bestellbar':'Aktuell nicht bestellbar'}</p>
    <Link className="leaf-compare__cta" to={`/products/${product.handle}`}>Produkt ansehen →</Link>
  </article>;
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
      <p className="page-lead">Wähle zwei Modelle und vergleiche die tatsächlichen Produktinformationen aus dem Shopify-Katalog. Keine erfundenen Leistungsdaten, keine Werbe-Pop-ups.</p>
    </header>
    {products.length?<>
      <div className="leaf-compare__selectors">
        <label>Leuchtmittel A<select value={leftId} onChange={e=>setLeftId(e.target.value)}>{products.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
        <label>Leuchtmittel B<select value={rightId} onChange={e=>setRightId(e.target.value)}>{products.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
      </div>
      <div className="leaf-compare__grid">
        <LampCard product={left} label="A · Erstes Produkt"/>
        <LampCard product={right} label="B · Zweites Produkt"/>
      </div>
      <section className="leaf-compare__facts" aria-label="Direkter Produktvergleich">
        <h2>Direkt gegenübergestellt</h2>
        <div className="leaf-compare__fact"><span>Preis ab</span><strong>{money(left)}</strong><strong>{money(right)}</strong></div>
        <div className="leaf-compare__fact"><span>Marke</span><strong>{left?.vendor||'–'}</strong><strong>{right?.vendor||'–'}</strong></div>
        <div className="leaf-compare__fact"><span>Bestellbarkeit</span><strong>{left?.variants.nodes.some(v=>v.availableForSale)?'Ja':'Nein'}</strong><strong>{right?.variants.nodes.some(v=>v.availableForSale)?'Ja':'Nein'}</strong></div>
        <p>Wattzahl, Abstrahlwinkel, PPFD und empfohlene Abstände werden erst angezeigt, wenn überprüfte, produktspezifische Herstellerdaten vorliegen. Preis und Verfügbarkeit können sich bis zum Checkout ändern.</p>
      </section>
    </>:<div className="leaf-compare__empty"><h2>Momentan keine geeigneten Produkte gefunden.</h2><p>Bitte nutze die Produktsuche, bis der Katalog für den direkten Vergleich vollständig verfügbar ist.</p><Link to="/search?q=LED">Pflanzenlampen suchen →</Link></div>}
  </main>;
}
const LIGHT_QUERY=`#graphql
  query LeafLightCompare($country:CountryCode,$language:LanguageCode)
  @inContext(country:$country,language:$language) {
    products(first:60,query:"LED") {
      nodes {
        id handle title vendor
        featuredImage { id url altText width height }
        priceRange { minVariantPrice { amount currencyCode } }
        variants(first:10) { nodes { id availableForSale } }
      }
    }
  }
` as const;
