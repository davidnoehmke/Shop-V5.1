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
} from '../../../supabase/functions/plant-photo-analysis/contract.mjs';

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
      `${context.env.SUPABASE_URL}/functions/v1/plant-photo-analysis`,
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
    if (upstream.ok) validateReport(payload.report);
    if (upstream.status === 429) auth.headers.set('Retry-After', '600');
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
