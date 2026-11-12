import {createHydrogenContext} from '@shopify/hydrogen';
import {AppSession} from '~/lib/session';
import {CART_QUERY_FRAGMENT} from '~/lib/fragments';
import type {CartApiQueryFragment} from 'storefrontapi.generated';

const additionalContext = {} as const;

type AdditionalContextType = typeof additionalContext;

declare global {
  interface HydrogenAdditionalContext extends AdditionalContextType {}
  interface HydrogenCustomCartFragment extends CartApiQueryFragment {}
}

function storefrontLocale(request: Request) {
  const {pathname} = new URL(request.url);
  const englishPath = pathname === '/en' || pathname.startsWith('/en/');
  return {
    language: englishPath ? ('EN' as const) : ('DE' as const),
    country: 'DE' as const,
  };
}

export async function createHydrogenRouterContext(
  request: Request,
  env: Env,
  executionContext: ExecutionContext,
) {
  if (!env?.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is not set');
  }

  const waitUntil = executionContext.waitUntil.bind(executionContext);
  const [cache, session] = await Promise.all([
    caches.open('hydrogen'),
    AppSession.init(request, [env.SESSION_SECRET]),
  ]);

  return createHydrogenContext(
    {
      env,
      request,
      cache,
      waitUntil,
      session,
      i18n: storefrontLocale(request),
      cart: {
        queryFragment: CART_QUERY_FRAGMENT,
      },
    },
    additionalContext,
  );
}
