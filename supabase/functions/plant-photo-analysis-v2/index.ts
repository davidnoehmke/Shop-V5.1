import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import jpeg from 'npm:jpeg-js@0.4.4';
import {normalizePhoto} from './image.mjs';
import {analyzePhoto} from './provider.mjs';
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
  normalizeImage(image: string) {return normalizePhoto(image, jpeg);},
  async rateAllowed(userId: string) {
    // Fixed caps cannot be raised by client input; failures deny paid requests.
    for (const [fingerprint, limit, window] of [
      [`plant-photo:${userId}`, 2, 600],
      ['plant-photo:global-budget-v2', 10, 3600],
    ] as const) {
      const {data, error} = await admin!.rpc('consume_storefront_assistant_rate_limit', {
        p_fingerprint: fingerprint, p_limit: limit, p_window_seconds: window,
      });
      if (error) throw new Error('limiter_unavailable');
      if (data !== true) return false;
    }
    return true;
  },
  analyze(args: any) {return analyzePhoto({...args, model});},
  log(event: unknown) {console.warn(JSON.stringify(event));},
}));
