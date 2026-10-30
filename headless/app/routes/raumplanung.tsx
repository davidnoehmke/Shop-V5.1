import {useLoaderData, useLocation, Link} from 'react-router';
import type {Route} from './+types/raumplanung';
import {RoomPlanner, type PlannerProduct} from '~/components/RoomPlanner';
import {RoomTour} from '~/components/RoomTour';

export const meta: Route.MetaFunction = ({location}) => [
  {
    title: `${location.pathname.startsWith('/en/') ? 'Room planning & 3D planner' : 'Raumplanung & 3D-Planer'} | LEAFerservice`,
  },
];
export async function loader({context}: Route.LoaderArgs) {
  const result = await context.storefront.query<{
    collection: {products: {nodes: PlannerProduct[]}} | null;
  }>(PLANNING_QUERY);
  return {products: result.collection?.products.nodes || []};
}
export default function Planning() {
  const {products} = useLoaderData<typeof loader>();
  const en = useLocation().pathname.startsWith('/en/');
  return (
    <div className="page-shell planning-page">
      <header className="page-intro">
        <p className="page-eyebrow">LEAFerservice</p>
        <h1>{en ? 'Plan your plant space.' : 'Plane deinen Pflanzenraum.'}</h1>
        <p>
          {en
            ? 'Explore six viewpoints or create your own room layout. Move straight from ideas to matching products.'
            : 'Erkunde sechs Sprungpunkte oder gestalte deinen eigenen Raum. Von der Idee gelangst du direkt zu passenden Produkten.'}
        </p>
        <nav
          className="planning-page__shortcuts"
          aria-label={en ? 'Planning tools' : 'Planungswerkzeuge'}
        >
          <a href="#room-tour">{en ? 'Explore the room' : 'Raum erkunden'} ↓</a>
          <a href="#room-planner">
            {en ? '3D room planner' : '3D-Raumplanung'} ↓
          </a>
          <Link
            to={
              en
                ? '/en/collections/interieur-solutions'
                : '/collections/interieur-solutions'
            }
          >
            Interieur Solutions →
          </Link>
        </nav>
      </header>
      <RoomTour locale={en ? 'en' : 'de'} />
      <RoomPlanner products={products} locale={en ? 'en' : 'de'} />
    </div>
  );
}
const PLANNING_QUERY = `#graphql
  query RoomPlanning($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    collection(handle: "interieur-solutions") {
      products(first: 40) { nodes {
        id title handle featuredImage { url }
        variants(first: 30) { nodes { id title availableForSale price { amount currencyCode } } }
      } }
    }
  }
` as const;
