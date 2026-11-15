import {data} from 'react-router';
import type {Route} from './+types/portal_.photo-analysis';
import {requirePortalUser} from '~/lib/supabase-auth.server';
import {PlantPhotoAnalysis} from '~/components/PlantPhotoAnalysis';
import photoStyles from '~/styles/plant-photo.css?url';

export const links: Route.LinksFunction = () => [
  {rel: 'stylesheet', href: photoStyles},
];
export const headers: Route.HeadersFunction = ({
  loaderHeaders,
  errorHeaders,
}) => (errorHeaders?.has('Cache-Control') ? errorHeaders : loaderHeaders);
export const meta: Route.MetaFunction = () => [
  {title: 'Pflanzen-Fotoanalyse | LEAFerservice'},
  {name: 'robots', content: 'noindex, nofollow'},
];
export async function loader({request, context}: Route.LoaderArgs) {
  const {headers} = await requirePortalUser(request, context.env);
  return data(null, {headers});
}
export default function PhotoAnalysisPage() {
  return <PlantPhotoAnalysis />;
}
