import {RoomPlanner3D} from '~/components/RoomPlanner3D';
import type {Route} from './+types/en.raumplaner-3d';

export const meta: Route.MetaFunction = () => [
  {title: '3D room planner for plants | LEAFerservice'},
  {name: 'description', content: 'Plan your plant space in an interactive 3D preview with areas for plants, planters, lighting, terrariums and vertical greenery.'},
];

export default function EnglishRoomPlannerPage() {
  return <RoomPlanner3D locale="en" />;
}
