import { recommend } from './engine.mjs';

const origins = new Set(['https://leaferservice.com', 'https://www.leaferservice.com']);
const maxBytes = 512 * 1024;

export async function handleAdvisor(req) {
  const origin = req.headers.get('origin') || '';
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization, apikey',
    'cache-control': 'no-store', 'vary': 'Origin', 'x-content-type-options': 'nosniff',
    ...(origins.has(origin) ? { 'access-control-allow-origin': origin } : {})
  };
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers });
  if (!origins.has(origin)) return json(403, { error: 'origin_not_allowed' });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (Number(req.headers.get('content-length')) > maxBytes) return json(413, { error: 'payload_too_large' });
  try {
    if (!req.body) return json(400, { error: 'invalid_request' });
    const reader = req.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return json(413, { error: 'payload_too_large' });
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const input = JSON.parse(new TextDecoder().decode(bytes));
    return json(200, recommend(input));
  } catch {
    return json(400, { error: 'invalid_request' });
  }
}
