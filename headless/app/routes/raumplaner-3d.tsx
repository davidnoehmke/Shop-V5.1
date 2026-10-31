import {RoomStudioEditor} from '~/components/RoomStudioEditor';
import type {CatalogItem} from '~/components/RoomStudioEditor';
import type {Route} from './+types/raumplaner-3d';
import {useLoaderData} from 'react-router';
export const meta:Route.MetaFunction=()=>[
  {title:'LEAF Room Studio – Raumplanung | LEAFerservice'},
  {name:'description',content:'Pflanzenräume planen: Grundriss erstellen und passende Gefäße, LEDs und Interieur-Systeme platzieren.'},
];
type Product={id:string;title:string;handle:string;vendor:string;productType:string;featuredImage?:{url:string}|null;roomWidth?:{value:string}|null;roomDepth?:{value:string}|null};
type Result={products:{nodes:Product[]}};
const QUERY=`#graphql
  query RoomStudioCatalog($country:CountryCode,$language:LanguageCode) @inContext(country:$country,language:$language){
    products(first:100){nodes{id title handle vendor productType featuredImage{url} roomWidth:metafield(namespace:"custom",key:"room_width_cm"){value} roomDepth:metafield(namespace:"custom",key:"room_depth_cm"){value}}}
  }
` as const;
function meters(v?:{value:string}|null){if(!v?.value)return null;const n=Number(v.value.replace(',','.'));return Number.isFinite(n)&&n>0&&n<=3000?n/100:null;}
function kind(p:Product):CatalogItem['kind']|null{const t=(p.title+' '+p.productType).toLowerCase();if(/led|pflanzenlicht|grow.light|leuchte|lampe|spot/.test(t))return 'light';if(/pflanzgefäß|pflanztopf|blumentopf|übertopf|pflanzkübel|planter|pot\b/.test(t))return 'planter';if(/regal|pflanzenwand|interieur.system|pflanzenständer/.test(t))return 'system';return null;}
export async function loader({context}:Route.LoaderArgs){
  try{const data=await context.storefront.query<Result>(QUERY,{cache:context.storefront.CacheShort()});const catalog:CatalogItem[]=data.products.nodes.flatMap(p=>{const k=kind(p);return k?[{id:p.id,title:p.title,handle:p.handle,vendor:p.vendor,kind:k,width:meters(p.roomWidth),depth:meters(p.roomDepth),image:p.featuredImage?.url}]:[];});return {catalog};}
  catch{return {catalog:[] as CatalogItem[]};}
}
export default function RoomPlannerPage(){const {catalog}=useLoaderData<typeof loader>();return <RoomStudioEditor catalog={catalog}/>;}
