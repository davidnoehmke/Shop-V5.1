import {useLoaderData} from 'react-router';
import type {Route} from './+types/en._index';
import {LeafEntryGateway} from '~/components/LeafEntryGateway';
import {loadEntryHomepage} from '~/lib/entry-home.server';
import entryStyles from '~/styles/entry-gateway.css?url';

// Keep loader exports local to each route for React Router's client/server split.
export async function loader({context}: Route.LoaderArgs) {
  return loadEntryHomepage(context);
}
export const links: Route.LinksFunction = () => [{rel: 'stylesheet', href: entryStyles}];
export const meta: Route.MetaFunction = () => [
  {title: 'Substrates, grow lights & plant guidance | LEAFerservice'},
  {name: 'description', content: 'LEAFerservice combines substrate systems, a custom substrate configurator, grow lighting, irrigation and plant knowledge with the LEAF AI assistant.'},
];
export default function EnglishHome() {
  const {substrateCollection, stories, heroImage} = useLoaderData<typeof loader>();
  return <LeafEntryGateway locale="en" heroImage={heroImage} stories={stories} products={substrateCollection?.products.nodes ?? []} />;
}
