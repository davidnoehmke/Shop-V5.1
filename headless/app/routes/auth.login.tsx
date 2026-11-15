import {
  data,
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router';
import type {Route} from './+types/auth.login';
import {
  assertSameOriginPost,
  createAuth,
  portalDestination,
} from '~/lib/supabase-auth.server';

export const headers: Route.HeadersFunction = ({
  actionHeaders,
  loaderHeaders,
  errorHeaders,
}) =>
  errorHeaders?.has('Cache-Control')
    ? errorHeaders
    : actionHeaders.has('Cache-Control')
      ? actionHeaders
      : loaderHeaders;
export const meta: Route.MetaFunction = () => [
  {title: 'Portal Login | LEAFerservice'},
  {name: 'robots', content: 'noindex, nofollow'},
];

export async function loader({request, context}: Route.LoaderArgs) {
  const auth = createAuth(request, context.env);
  const url = new URL(request.url);
  const returnTo = portalDestination(url.searchParams.get('returnTo'));
  const {data: result} = await auth.client.auth.getUser();
  if (result.user && !result.user.is_anonymous)
    return redirect(returnTo, {headers: auth.headers});
  return data(
    {
      returnTo,
      english:
        url.searchParams.get('lang') === 'en' ||
        new URL(returnTo, url.origin).searchParams.get('lang') === 'en',
    },
    {headers: auth.headers},
  );
}

export async function action({request, context}: Route.ActionArgs) {
  assertSameOriginPost(request);
  const auth = createAuth(request, context.env);
  const form = await request.formData();
  const email = form.get('email');
  const password = form.get('password');
  if (
    typeof email !== 'string' ||
    !email.trim() ||
    email.length > 254 ||
    typeof password !== 'string' ||
    !password ||
    password.length > 4096
  ) {
    return data({failed: true}, {status: 400, headers: auth.headers});
  }
  const {data: result, error} = await auth.client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error || !result.user || result.user.is_anonymous) {
    // Generic error avoids disclosing whether an email has an account.
    return data({failed: true}, {status: 400, headers: auth.headers});
  }
  return redirect(portalDestination(form.get('returnTo')), {
    status: 303,
    headers: auth.headers,
  });
}

export default function PortalLogin() {
  const {returnTo, english} = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const busy = useNavigation().state !== 'idle';
  return (
    <section className="account" lang={english ? 'en' : 'de'}>
      <h1>{english ? 'Portal sign-in' : 'Portal-Anmeldung'}</h1>
      <p>
        {english
          ? 'Sign in with your existing portal account.'
          : 'Melde dich mit deinem bestehenden Portal-Zugang an.'}
      </p>
      <Form method="post" reloadDocument>
        <input type="hidden" name="returnTo" value={returnTo} />
        <label htmlFor="portal-email">E-Mail</label>
        <input
          id="portal-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
        />
        <label htmlFor="portal-password">
          {english ? 'Password' : 'Passwort'}
        </label>
        <input
          id="portal-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={4096}
        />
        {result?.failed ? (
          <p role="alert">
            {english
              ? 'Sign-in failed. Check your details or try again later.'
              : 'Anmeldung fehlgeschlagen. Prüfe deine Zugangsdaten oder versuche es später erneut.'}
          </p>
        ) : null}
        <button type="submit" disabled={busy}>
          {busy
            ? english
              ? 'Signing in…'
              : 'Anmeldung läuft…'
            : english
              ? 'Sign in'
              : 'Anmelden'}
        </button>
      </Form>
    </section>
  );
}
