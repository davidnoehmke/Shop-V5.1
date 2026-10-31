import {RoomStudioEditor} from '~/components/RoomStudioEditor';
import type {Route} from './+types/raumplaner-3d';
export const meta: Route.MetaFunction = () => [
  {title:'LEAF Room Studio – Raumplanung | LEAFerservice'},
  {name:'description',content:'Pflanzenräume maßbasiert planen: Grundriss erstellen, Gefäße, LEDs und Interieur-Systeme per Drag-and-drop platzieren und Plan speichern.'},
];
export default function RoomPlannerPage(){return <RoomStudioEditor/>;}
