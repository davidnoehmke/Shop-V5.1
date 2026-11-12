export {loader, default} from './blogs._index';
import type {Route} from './+types/en.blogs._index';

export const meta: Route.MetaFunction = () => [
  {title: 'Plant guides & growing knowledge | LEAFerservice'},
  {
    name: 'description',
    content:
      'Practical guides on houseplants, substrates, grow lighting, irrigation and propagation from LEAFerservice.',
  },
];
