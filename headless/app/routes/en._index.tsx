import {useLoaderData} from 'react-router';
import type {Route} from './+types/en._index';
import {LeafEntryGateway} from '~/components/LeafEntryGateway';
import {loader} from './_index';

// Both locales use the same catalog and editorial query; context supplies locale.
export {loader, links} from './_index';
export const meta: Route.MetaFunction = () => [
  {title: 'Substrates, grow lights & plant guidance | LEAFerservice'},
  {name: 'description', content: 'LEAFerservice combines substrate systems, a custom substrate configurator, grow lighting, irrigation and plant knowledge with the LEAF AI assistant.'},
];
export default function EnglishHome() {
  const {substrateCollection, stories, heroImage} = useLoaderData<typeof loader>();
  return <LeafEntryGateway locale="en" heroImage={heroImage} stories={stories} products={substrateCollection?.products.nodes ?? []} />;
}
