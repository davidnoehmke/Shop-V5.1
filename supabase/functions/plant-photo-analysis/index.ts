import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import {createPhotoHandler} from './handler.mjs';

function serviceKey() {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    if (keys.default) return keys.default;
  } catch { /* Legacy deployments may only export SERVICE_ROLE_KEY. */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
}
const url = Deno.env.get('SUPABASE_URL') || '';
const key = serviceKey();
const admin = url && key ? createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}}) : null;
// Reuse the deployed assistant's provider and credentials; no browser provider key.
const model = Deno.env.get('PLANT_PHOTO_MODEL') || Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-mini';

Deno.serve(createPhotoHandler({
  async getUser(token: string) {
    if (!admin) throw new Error('auth_unavailable');
    const {data, error} = await admin.auth.getUser(token);
    if (error) return null;
    return data.user;
  },
  async getModelKey() {
    const configured = Deno.env.get('OPENAI_API_KEY')?.trim();
    if (configured) return configured;
    const {data, error} = await admin!.rpc('leaf_read_server_secret', {p_name: 'OPENAI_API_KEY'});
    if (error) return '';
    return typeof data === 'string' ? data.trim() : '';
  },
  async rateAllowed(userId: string) {
    const {data, error} = await admin!.rpc('consume_storefront_assistant_rate_limit', {
      p_fingerprint: `plant-photo:${userId}`, p_limit: 5, p_window_seconds: 600,
    });
    if (error) throw new Error('limiter_unavailable');
    return data === true;
  },
  async analyze({key, instructions, input, schema, signal}: any) {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {Authorization: `Bearer ${key}`, 'Content-Type': 'application/json'},
      signal: AbortSignal.any([signal, AbortSignal.timeout(40_000)]),
      body: JSON.stringify({
        model, store: false, instructions, max_output_tokens: 2400,
        input: [{role: 'user', content: [
          {type: 'input_text', text: input.context || (input.mode === 'identify' ? 'Identify this plant.' : 'Assess this plant problem.')},
          ...input.images.map((image: string) => ({type: 'input_image', image_url: image, detail: 'high'})),
        ]}],
        text: {format: {type: 'json_schema', name: 'plant_photo_report', strict: true, schema}},
      }),
    });
    if (!response.ok) throw new Error('provider_unavailable');
    const payload = await response.json();
    if (payload.status !== 'completed') throw new Error('incomplete_output');
    const text = (payload.output || []).flatMap((item: any) => item.content || []).filter((item: any) => item.type === 'output_text').map((item: any) => item.text).join('');
    return {report: JSON.parse(text), model};
  },
  log(event: unknown) {console.warn(JSON.stringify(event));},
}));
