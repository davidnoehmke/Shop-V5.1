import {data, Form, useLoaderData} from 'react-router';
import type {Route} from './+types/portal';
import {requirePortalUser} from '~/lib/supabase-auth.server';

export const headers: Route.HeadersFunction = ({loaderHeaders, errorHeaders}) =>
  errorHeaders?.has('Cache-Control') ? errorHeaders : loaderHeaders;
export const meta: Route.MetaFunction = () => [
  {title: 'Portal | LEAFerservice'},
  {name: 'robots', content: 'noindex, nofollow'},
];

export async function loader({request, context}: Route.LoaderArgs) {
  const {user, headers} = await requirePortalUser(request, context.env);
  return data(
    {
      email: user.email,
      english: new URL(request.url).searchParams.get('lang') === 'en',
    },
    {headers},
  );
}

export default function Portal() {
  const {email, english} = useLoaderData<typeof loader>();
  return (
    <section className="account" lang={english ? 'en' : 'de'}>
      <h1>{english ? 'Your portal' : 'Dein Portal'}</h1>
      <p>
        {english ? 'Signed in as' : 'Angemeldet als'} {email}
      </p>
      <Form method="post" action="/auth/logout" reloadDocument>
        <button type="submit">{english ? 'Sign out' : 'Abmelden'}</button>
      </Form>
    </section>
  );
}
