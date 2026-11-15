import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const allowedTables = ["sync_state","sync_log","content_topics","content_articles","content_approval_queue","knowledge_entities","knowledge_qa","visual_asset_jobs","shopify_resource_snapshots","code_review_runs","product_bundles","product_bundle_components","shopify_metafield_registry","shopify_metafield_state","product_quality_profiles","product_quality_rules","product_observations","product_readiness","product_sync_queue","product_candidate_packages","admin_ai_launchers","analytics_snapshots","analytics_events","procurement_quotes","procurement_agent_state","commerce_ssot_policy","storefront_product_content","configurator_components","configurator_profiles","storefront_seo_pages","content_atoms","content_atom_links","commerce_locales","localization_backlog","commerce_market_readiness","analytics_daily_reports"];
const browserOrigins = new Set(["https://leaferservice.com","https://www.leaferservice.com"]);
const localOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d{2,5})?$/;
const enc = new TextEncoder();
const MAX_BODY_BYTES = 64 * 1024;

function readSecretKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS") ?? "";
  if (raw) {
    try {
      const keys = JSON.parse(raw);
      if (typeof keys?.default === "string" && keys.default) return keys.default;
    } catch {
      console.error("leaf-control-api could not parse SUPABASE_SECRET_KEYS");
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

function originAllowed(origin: string) {
  return !origin || browserOrigins.has(origin) || localOrigin.test(origin);
}

function responseHeaders(origin: string) {
  const headers: Record<string,string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST,OPTIONS"
  };
  if (browserOrigins.has(origin) || localOrigin.test(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(origin: string, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(origin) });
}

async function sha(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", enc.encode(value));
  return [...new Uint8Array(bytes)].map((x) => x.toString(16).padStart(2,"0")).join("");
}

async function pbkdf2(password: string, saltHex: string, iterations: number) {
  const parts = saltHex.match(/.{1,2}/g);
  if (!parts) throw new Error("invalid_salt");
  const salt = new Uint8Array(parts.map((x) => parseInt(x,16)));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name:"PBKDF2", hash:"SHA-256", salt, iterations }, key, 256);
  return [...new Uint8Array(bits)].map((x) => x.toString(16).padStart(2,"0")).join("");
}

function randomHex(size = 16) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return [...bytes].map((x) => x.toString(16).padStart(2,"0")).join("");
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  if (!originAllowed(origin)) return json(origin, { error:"origin_not_allowed" }, 403);
  if (req.method === "OPTIONS") return new Response(null, { status:204, headers:responseHeaders(origin) });
  if (req.method !== "POST") return json(origin, { error:"method_not_allowed" }, 405);

  const declared = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return json(origin, { error:"payload_too_large" }, 413);

  const secret = readSecretKey();
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  if (!secret || !supabaseUrl) return json(origin, { error:"server_config" }, 500);
  const sb = createClient(supabaseUrl, secret, { auth:{ persistSession:false, autoRefreshToken:false, detectSessionInUrl:false } });

  let body: any;
  try {
    const raw = await req.text();
    if (enc.encode(raw).byteLength > MAX_BODY_BYTES) return json(origin, { error:"payload_too_large" }, 413);
    body = JSON.parse(raw);
  } catch {
    return json(origin, { error:"invalid_request" }, 400);
  }

  if (body.action === "login") {
    const username = String(body.username || "").slice(0,100);
    const password = String(body.password || "").slice(0,512);
    const { data } = await sb.from("control_licenses").select("*").eq("role","owner").maybeSingle();
    if (!data || data.revoked_at) return json(origin, { error:"login_rejected" }, 403);
    if (!data.password_hash || !data.password_salt || !data.login_username) return json(origin, { error:"owner_setup_required" }, 403);
    if (data.locked_until && new Date(data.locked_until) > new Date()) return json(origin, { error:"temporarily_locked" }, 429);

    let ok = false;
    if (username === data.login_username) {
      const candidate = await pbkdf2(password, data.password_salt, data.password_iterations || 210000);
      ok = constantTimeEqual(candidate, data.password_hash);
    }
    if (!ok) {
      const fails = (data.failed_login_count || 0) + 1;
      const patch: any = { failed_login_count:fails };
      if (fails >= 5) {
        patch.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        patch.failed_login_count = 0;
      }
      await sb.from("control_licenses").update(patch).eq("license_id",data.license_id);
      return json(origin, { error:"login_rejected" }, 403);
    }

    const token = crypto.randomUUID() + "." + crypto.randomUUID();
    await sb.from("control_licenses").update({
      device_token_hash: await sha(token),
      failed_login_count: 0,
      locked_until: null
    }).eq("license_id",data.license_id);

    return json(origin, {
      device_token: token,
      must_change_password: Boolean(data.must_change_password),
      role: data.role,
      permissions: data.permissions
    });
  }

  if (body.action === "activate") {
    const license = body.license || {};
    if (!license.license_id || !license.secret) return json(origin, { error:"invalid_license" }, 400);
    const { data } = await sb.from("control_licenses").select("*").eq("license_id",license.license_id).maybeSingle();
    if (!data || data.revoked_at || !constantTimeEqual(String(data.secret_hash || ""), await sha(String(license.secret)))) {
      return json(origin, { error:"license_rejected" }, 403);
    }
    if (data.activated_at) return json(origin, { error:"license_already_activated" }, 409);
    const token = crypto.randomUUID() + "." + crypto.randomUUID();
    const { data:updated, error } = await sb.from("control_licenses")
      .update({ activated_at:new Date().toISOString(), device_token_hash:await sha(token) })
      .eq("license_id",license.license_id)
      .is("activated_at",null)
      .select("license_id")
      .maybeSingle();
    if (error || !updated) return json(origin, { error:"activation_failed" }, 409);
    return json(origin, { device_token:token, role:data.role, permissions:data.permissions, must_change_password:data.must_change_password });
  }

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i,"");
  if (!token) return json(origin, { error:"unauthorized" }, 401);
  const { data:license } = await sb.from("control_licenses").select("*").eq("device_token_hash",await sha(token)).maybeSingle();
  if (!license || license.revoked_at) return json(origin, { error:"unauthorized" }, 401);

  if (body.action === "change_password") {
    const password = String(body.password || "");
    if (password.length < 12 || password.length > 512) return json(origin, { error:"invalid_password" }, 400);
    const salt = randomHex();
    const hash = await pbkdf2(password,salt,210000);
    const { error } = await sb.from("control_licenses").update({
      password_salt:salt,
      password_hash:hash,
      password_iterations:210000,
      must_change_password:false,
      password_changed_at:new Date().toISOString()
    }).eq("license_id",license.license_id);
    if (error) return json(origin, { error:"password_change_failed" }, 500);
    return json(origin, { ok:true });
  }

  if (license.must_change_password) return json(origin, { error:"password_change_required" }, 403);

  if (body.action === "tables") return json(origin, { tables:allowedTables });

  if (body.action === "rows") {
    const table = String(body.table || "");
    if (!allowedTables.includes(table)) return json(origin, { error:"table_not_allowed" }, 403);
    const limit = Math.min(Math.max(Number(body.limit) || 50,1),100);
    const { data, error } = await sb.from(table).select("*").limit(limit);
    if (error) return json(origin, { error:"query_failed" }, 400);
    return json(origin, { table, rows:data });
  }

  return json(origin, { error:"unknown_action" }, 400);
});
