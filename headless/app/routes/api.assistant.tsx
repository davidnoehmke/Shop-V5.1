import type {Route} from './+types/api.assistant';

const ENDPOINT = 'https://vbqimcwaxcydegqlkkgw.supabase.co/functions/v1/storefront-assistant';

export async function action({request}: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return Response.json({error: 'method_not_allowed'}, {status: 405});
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return Response.json({error: 'invalid_content_type'}, {status: 415});
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 100_000) {
    return Response.json({error: 'payload_too_large'}, {status: 413});
  }

  const upstream = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://leaferservice.com',
      'user-agent': request.headers.get('user-agent') || 'LEAFerservice Hydrogen',
    },
    body: raw,
  });

  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export async function loader() {
  return Response.json({error: 'method_not_allowed'}, {status: 405});
}
