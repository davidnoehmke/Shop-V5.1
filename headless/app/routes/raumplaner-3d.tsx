import {RoomPlanner3D} from '~/components/RoomPlanner3D';
import type {Route} from './+types/raumplaner-3d';
export const meta:Route.MetaFunction=()=>[
 {title:'3D-Raumplaner für Pflanzen | LEAFerservice'},
 {name:'description',content:'Gestalte deinen Pflanzenraum in einer interaktiven 3D-Vorschau. Sechs Bereiche für Pflanzen, Pflanzgefäße, Licht, Terrarium und vertikale Begrünung.'}
];
export default function RoomPlannerPage(){return <RoomPlanner3D locale="de"/>;}
