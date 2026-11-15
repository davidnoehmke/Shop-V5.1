import {analysisInstructions, readBoundedJson, REPORT_SCHEMA, validatePhotoRequest, validateReport} from './contract.mjs';
export function createPhotoHandler(deps) {
  return async request => {
    const requestId = crypto.randomUUID();
    const respond = (status, body, extra = {}) => Response.json({...body, requestId}, {status, headers: {'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', ...extra}});
    if (request.method !== 'POST') return respond(405, {error: 'method_not_allowed'}, {Allow: 'POST'});
    const token = /^Bearer ([^\s]+)$/.exec(request.headers.get('authorization') || '')?.[1];
    if (!token) return respond(401, {error: 'authentication_required'});
    let user;
    try { user = await deps.getUser(token); } catch { return respond(503, {error: 'auth_unavailable'}); }
    if (!user || user.is_anonymous) return respond(401, {error: 'authentication_required'});
    let input;
    try {input = validatePhotoRequest(await readBoundedJson(request));} catch (error) {
      const code = error.message;
      return respond(code === 'payload_too_large' ? 413 : code === 'invalid_content_type' ? 415 : 400, {error: code});
    }
    try {
      const key = await deps.getModelKey();
      if (!key) return respond(503, {error: 'analysis_unavailable'});
      // Persistent, atomic limits keyed by server-verified user ID, never a client-supplied ID/IP.
      if (!await deps.rateAllowed(user.id)) return respond(429, {error: 'rate_limited'}, {'Retry-After': '600'});
      const result = await deps.analyze({key, requestId, instructions: analysisInstructions(input.locale, input.mode), input, schema: REPORT_SCHEMA, signal: request.signal});
      const report = validateReport(result.report);
      return respond(200, {report, model: result.model, version: '1', analyzedAt: new Date().toISOString()});
    } catch (error) {
      const timeout = ['TimeoutError', 'AbortError'].includes(error?.name);
      // Never log images, context, tokens, model output or provider response bodies.
      deps.log?.({requestId, event: timeout ? 'timeout' : 'analysis_failed'});
      return respond(timeout ? 504 : 502, {error: timeout ? 'analysis_timeout' : 'analysis_unavailable'});
    }
  };
}
