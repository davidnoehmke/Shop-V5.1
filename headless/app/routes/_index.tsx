import {useLoaderData} from 'react-router';
import type {Route} from './+types/_index';
import {LeafEntryGateway} from '~/components/LeafEntryGateway';
import entryStyles from '~/styles/entry-gateway.css?url';

// Keep the established home URL and metadata. This PR changes the entry UX only.
export const meta: Route.MetaFunction = () => [
  {title: 'Substrate, Pflanzenlicht & Beratung | LEAFerservice'},
  {name: 'description', content: 'LEAFerservice verbindet eigene Substratmischungen, einen Substrat-Konfigurator, Pflanzenlicht, Bew\u00e4sserung und Pflanzenwissen mit dem KI-Assistenten LEAF.'},
];
export const links: Route.LinksFunction = () => [{rel: 'stylesheet', href: entryStyles}];

export {loadHomepage as loader} from '~/lib/homepage.server';
import type {loadHomepage as loader} from '~/lib/homepage.server';

export default function Homepage() {
  const {substrateCollection, stories, heroImage} = useLoaderData<typeof loader>();
  return <LeafEntryGateway locale="de" heroImage={heroImage} stories={stories} products={substrateCollection?.products.nodes ?? []} />;
}
