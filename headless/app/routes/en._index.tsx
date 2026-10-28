import type {Route} from './+types/en._index';
import {LeafAtrium} from '~/components/LeafAtrium';

export const meta: Route.MetaFunction = () => [
  {title: 'LEAF Campus – curated plant worlds | LEAFerservice'},
  {
    name: 'description',
    content:
      'Enter LEAFerservice through curated worlds for substrate, lighting, watering, containers, propagation and plant knowledge.',
  },
  {name: 'robots', content: 'noindex,nofollow'},
];

export default function EnglishHome() {
  return (
    <main className="leafer-home">
      <LeafAtrium locale="en" />
    </main>
  );
}
