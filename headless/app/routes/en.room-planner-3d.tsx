import {RoomPlanner3D} from '~/components/RoomPlanner3D';
import type {Route} from './+types/en.room-planner-3d';
export const meta:Route.MetaFunction=()=>[
 {title:'3D plant room planner | LEAFerservice'},
 {name:'description',content:'Explore six plant room planning zones with an interactive 3D preview for plants, planters, lighting and vertical planting.'}
];
export default function RoomPlannerEnglishPage(){return <RoomPlanner3D locale="en"/>;}
