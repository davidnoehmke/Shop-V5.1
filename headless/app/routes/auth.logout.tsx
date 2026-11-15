import {data, redirect} from 'react-router';
import type {Route} from './+types/auth.logout';
import {
  assertSameOriginPost,
  requirePortalUser,
} from '~/lib/supabase-auth.server';

export async function loader() {
  return new Response('Method not allowed', {
    status: 405,
    headers: {Allow: 'POST'},
  });
}

export async function action({request, context}: Route.ActionArgs) {
  assertSameOriginPost(request);
  const auth = await requirePortalUser(request, context.env);
  const {error} = await auth.client.auth.signOut({scope: 'local'});
  if (error)
    return data(
      {error: 'Abmeldung fehlgeschlagen. / Sign-out failed.'},
      {status: 503, headers: auth.headers},
    );
  return redirect('/auth/login', {status: 303, headers: auth.headers});
}
