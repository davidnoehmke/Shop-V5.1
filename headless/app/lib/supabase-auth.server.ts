import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from '@supabase/ssr';
import {redirect} from 'react-router';

type AuthEnv = {
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
};

export function privateHeaders() {
  return new Headers({
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    Vary: 'Cookie',
  });
}

// Only local portal destinations are accepted. Never redirect to a submitted URL.
export function portalDestination(value: unknown) {
  if (typeof value !== 'string' || /[\\\r\n]/.test(value)) return '/portal';
  try {
    const url = new URL(value, 'https://local.invalid');
    if (url.origin !== 'https://local.invalid') return '/portal';
    if (url.pathname !== '/portal' && !url.pathname.startsWith('/portal/'))
      return '/portal';
    return url.pathname + url.search;
  } catch {
    return '/portal';
  }
}

export function assertSameOriginPost(request: Request) {
  if (request.method !== 'POST') {
    throw new Response('Method not allowed', {
      status: 405,
      headers: {Allow: 'POST'},
    });
  }
  if (request.headers.get('Origin') !== new URL(request.url).origin) {
    throw new Response('Forbidden', {status: 403, headers: privateHeaders()});
  }
}

export function createAuth(request: Request, env: AuthEnv) {
  const headers = privateHeaders();
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    throw new Response(
      'Anmeldung derzeit nicht verfügbar. / Sign-in is currently unavailable.',
      {
        status: 503,
        headers,
      },
    );
  }
  const client = createServerClient(
    env.SUPABASE_URL,
    env.SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: new URL(request.url).protocol === 'https:',
      },
      cookies: {
        getAll: () =>
          parseCookieHeader(request.headers.get('Cookie') ?? '').map(
            ({name, value}) => ({name, value: value ?? ''}),
          ),
        setAll(cookies, cacheHeaders) {
          for (const {name, value, options} of cookies) {
            headers.append(
              'Set-Cookie',
              serializeCookieHeader(name, value, options),
            );
          }
          for (const [name, value] of Object.entries(cacheHeaders ?? {})) {
            headers.set(name, value);
          }
        },
      },
    },
  );
  return {client, headers};
}

// Call in EVERY protected loader/action: parent loaders run in parallel with children.
export async function requirePortalUser(request: Request, env: AuthEnv) {
  const auth = createAuth(request, env);
  const {data, error} = await auth.client.auth.getUser();
  if (error || !data.user || data.user.is_anonymous) {
    const destination = portalDestination(
      new URL(request.url).pathname + new URL(request.url).search,
    );
    throw redirect(`/auth/login?returnTo=${encodeURIComponent(destination)}`, {
      headers: auth.headers,
    });
  }
  return {...auth, user: data.user};
}
