import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PROJECT_TTL_MS = 180 * 24 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 8192;
const allowedOrigins = new Set([
  "https://leaferservice.com",
  "https://www.leaferservice.com"
]);

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9-]{0,100}$/;
const allowedSteps = new Set(["world", "need", "context", "preference", "result"]);
const stateKeys = ["world", "need", "context", "preference"] as const;

function originAllowed(origin: string) {
  return origin === "" || allowedOrigins.has(origin);
}

function responseHeaders(origin: string) {
  const headers: Record<string, string> = {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "vary": "Origin"
  };
  if (allowedOrigins.has(origin)) headers["access-control-allow-origin"] = origin;
  return headers;
}

function json(origin: string, status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(origin) });
}

function cleanText(value: unknown, maxLength = 160) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function sanitizeSelected(value: unknown) {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const selected: Record<string, string> = {};
  for (const key of stateKeys) selected[key] = cleanText(input[key], 160);
  return selected;
}

async function rest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRole);
  headers.set("authorization", `Bearer ${serviceRole}`);
  if (init.body) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (!originAllowed(origin)) return json(origin, 403, { error: "origin_not_allowed" });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: responseHeaders(origin) });
  if (!supabaseUrl || !serviceRole) return json(origin, 503, { error: "service_unavailable" });

  try {
    if (req.method === "GET") {
      const code = cleanText(new URL(req.url).searchParams.get("code"), 64);
      if (!uuidPattern.test(code)) return json(origin, 400, { error: "invalid_project_code" });

      const upstream = await rest(
        `configurator_projects?select=resume_code,result_summary,expires_at,updated_at&resume_code=eq.${encodeURIComponent(code)}&limit=1`
      );
      if (!upstream.ok) {
        console.error("configurator-project read failed", upstream.status);
        return json(origin, 503, { error: "temporarily_unavailable" });
      }

      const rows = await upstream.json() as Array<{
        resume_code: string;
        result_summary: Record<string, unknown> | null;
        expires_at: string | null;
        updated_at: string;
      }>;
      const row = rows[0];
      if (!row) return json(origin, 404, { error: "project_not_found" });
      if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
        return json(origin, 410, { error: "project_expired" });
      }

      const summary = row.result_summary && typeof row.result_summary === "object" ? row.result_summary : {};
      const collection = cleanText(summary.collection, 100);
      const step = cleanText(summary.step, 32);

      return json(origin, 200, {
        code: row.resume_code,
        selected: sanitizeSelected(summary.selected),
        collection: slugPattern.test(collection) ? collection : "",
        step: allowedSteps.has(step) ? step : "world",
        expires_at: row.expires_at,
        updated_at: row.updated_at
      });
    }

    if (req.method === "POST") {
      const declaredLength = Number(req.headers.get("content-length") ?? 0);
      if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
        return json(origin, 413, { error: "payload_too_large" });
      }

      let body: Record<string, unknown>;
      try {
        body = await req.json();
      } catch {
        return json(origin, 400, { error: "invalid_json" });
      }

      const code = cleanText(body.resume_code, 64);
      if (!uuidPattern.test(code)) return json(origin, 400, { error: "invalid_project_code" });

      const selected = sanitizeSelected(body.selected);
      const collection = cleanText(body.collection, 100);
      if (!slugPattern.test(collection)) return json(origin, 400, { error: "invalid_collection" });

      const requestedStep = cleanText(body.step, 32);
      const step = allowedSteps.has(requestedStep) ? requestedStep : "world";
      const now = new Date();
      const expiresAt = new Date(now.getTime() + PROJECT_TTL_MS).toISOString();

      const row = {
        resume_code: code,
        mode: "guided",
        recipe: {},
        addons: {},
        result_summary: { selected, collection, step },
        expires_at: expiresAt,
        updated_at: now.toISOString()
      };

      const upstream = await rest("configurator_projects?on_conflict=resume_code", {
        method: "POST",
        headers: { prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(row)
      });
      if (!upstream.ok) {
        console.error("configurator-project write failed", upstream.status);
        return json(origin, 503, { error: "temporarily_unavailable" });
      }

      return json(origin, 200, {
        code,
        selected,
        collection,
        step,
        expires_at: expiresAt
      });
    }

    return json(origin, 405, { error: "method_not_allowed" });
  } catch {
    return json(origin, 503, { error: "temporarily_unavailable" });
  }
});