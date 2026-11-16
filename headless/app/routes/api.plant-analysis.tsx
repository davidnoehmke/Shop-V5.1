import {
  photoProductRule,
  PHOTO_PRODUCTS_QUERY,
} from '~/lib/plant-photo-products';
import type {
  PlantPhotoReport,
  PlantCare,
  PhotoProduct,
} from '~/lib/plant-photo';
import type {Route} from './+types/api.plant-analysis';
import {
  assertSameOriginPost,
  requirePortalUser,
  privateHeaders,
} from '~/lib/supabase-auth.server';
import {
  readBoundedJson,
  validatePhotoRequest,
  validateReport,
} from '../../../supabase/functions/plant-photo-analysis-v2/contract.mjs';

export async function loader() {
  return Response.json(
    {error: 'method_not_allowed'},
    {status: 405, headers: {Allow: 'POST'}},
  );
}

export async function action({request, context}: Route.ActionArgs) {
  assertSameOriginPost(request);
  let auth;
  try {
    auth = await requirePortalUser(request, context.env);
  } catch (error) {
    if (error instanceof Response && error.status === 302)
      return Response.json(
        {error: 'authentication_required'},
        {status: 401, headers: error.headers},
      );
    throw error;
  }
  let input;
  try {
    input = validatePhotoRequest(await readBoundedJson(request));
  } catch (error) {
    const code = error instanceof Error ? error.message : 'invalid_request';
    return Response.json(
      {error: code},
      {status: code === 'payload_too_large' ? 413 : 400, headers: auth.headers},
    );
  }
  // Identity was verified above. getSession is used only to forward the raw token.
  const {
    data: {session},
  } = await auth.client.auth.getSession();
  if (!session)
    return Response.json(
      {error: 'authentication_required'},
      {status: 401, headers: auth.headers},
    );
  try {
    const upstream = await fetch(
      `${context.env.SUPABASE_URL}/functions/v1/plant-photo-analysis-v2`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: context.env.SUPABASE_PUBLISHABLE_KEY!,
        },
        body: JSON.stringify({...input, consent: true}),
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(50_000)]),
      },
    );
    const payload = (await upstream.json()) as Record<string, unknown>;
    if (upstream.ok) {
      const report = validateReport(payload.report) as PlantPhotoReport;
      const rule = photoProductRule(report, input.care as PlantCare);
      let products: PhotoProduct[] = [];
      if (rule) {
        try {
          const catalog = await context.storefront.query(PHOTO_PRODUCTS_QUERY, {
            variables: {
              query: rule.query,
              language: input.locale === 'en' ? 'EN' : 'DE',
            },
            cache: context.storefront.CacheNone(),
          });
          products = catalog.products.nodes
            .filter(
              (product) =>
                product.availableForSale &&
                /(?:plant|grow|pflanz|sunlight)/i.test(product.title),
            )
            .slice(0, 3)
            .map((product) => ({
              id: product.id,
              handle: product.handle,
              title: product.title,
              image: product.featuredImage
                ? {
                    url: product.featuredImage.url,
                    altText: product.featuredImage.altText ?? null,
                  }
                : null,
              price: product.priceRange.minVariantPrice,
              reason:
                input.locale === 'en'
                  ? 'You reported low light and the assessment suggests checking light supply. Check the required distance and coverage before choosing a lamp.'
                  : 'Du hast wenig Licht angegeben und die Einschätzung legt eine Lichtprüfung nahe. Prüfe Abstand und beleuchtete Fläche, bevor du eine Lampe auswählst.',
            }));
        } catch {
          // Product lookup failure must never discard the completed care report.
        }
      }
      payload.products = products;
    }
    if (upstream.headers.has('Retry-After'))
      auth.headers.set('Retry-After', upstream.headers.get('Retry-After')!);
    return Response.json(payload, {
      status: upstream.status,
      headers: auth.headers,
    });
  } catch (error) {
    const timeout =
      error instanceof Error &&
      ['TimeoutError', 'AbortError'].includes(error.name);
    return Response.json(
      {error: timeout ? 'analysis_timeout' : 'analysis_unavailable'},
      {status: timeout ? 504 : 502, headers: auth?.headers ?? privateHeaders()},
    );
  }
}
