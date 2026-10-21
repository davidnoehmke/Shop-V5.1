// LEAFerOS unified catalog sync: pure invariants shared by workers and tests.
// Never treat an external image URL as an approved/licensed product photo.
export const API_VERSION = "2026-10";
export const PRODUCT_GID = /^gid:\/\/shopify\/Product\/[0-9]+$/;
export const VARIANT_GID = /^gid:\/\/shopify\/ProductVariant\/[0-9]+$/;
export const ALLOWED_STATUS = new Set(["ACTIVE", "DRAFT", "ARCHIVED"]);
export const INBOUND_TOPICS = new Set([
  "products/create", "products/update", "products/delete",
  "collections/create", "collections/update", "collections/delete",
  "metafields/create", "metafields/update", "metafields/delete"
]);

function fail(reason) { throw new Error("catalog_sync:" + reason); }
function nodes(conn, name) {
  if (!conn || !Array.isArray(conn.nodes)) fail(name + "_missing");
  if (conn.pageInfo?.hasNextPage !== false) fail(name + "_incomplete");
  return conn.nodes;
}
export function normalizeProduct(raw) {
  if (!PRODUCT_GID.test(raw?.id || "")) fail("invalid_product_gid");
  if (!ALLOWED_STATUS.has(raw.status)) fail("invalid_product_status");
  if (!raw.handle || !raw.updatedAt || !raw.title) fail("missing_product_identity");
  const variants = nodes(raw.variants, "variants").map((v) => {
    if (!VARIANT_GID.test(v.id || "") || !v.updatedAt) fail("variant_identity_incomplete");
    const price = Number(v.price);
    if (!Number.isFinite(price) || price < 0) fail("variant_price_invalid");
    return {
      id: v.id, sku: v.sku || null, title: v.title || "",
      price: v.price, compareAtPrice: v.compareAtPrice || null,
      inventoryQuantity: v.inventoryQuantity, inventoryPolicy: v.inventoryPolicy,
      updatedAt: v.updatedAt, selectedOptions: v.selectedOptions || []
    };
  });
  const images = nodes(raw.media, "media").filter((m) => m?.image?.url).map((m, index) => ({
    id: m.id, position: index + 1, url: m.image.url,
    alt: m.alt || m.image.altText || "", width: m.image.width,
    height: m.image.height, fileStatus: m.fileStatus || null
  }));
  const metafields = nodes(raw.metafields, "metafields").map((m) => ({
    id: m.id, namespace: m.namespace, key: m.key, type: m.type,
    value: m.value, updatedAt: m.updatedAt
  }));
  return {
    id: raw.id, handle: raw.handle, title: raw.title, vendor: raw.vendor || "",
    productType: raw.productType || "", descriptionHtml: raw.descriptionHtml || "",
    tags: raw.tags || [], status: raw.status, updatedAt: raw.updatedAt,
    seo: raw.seo || { title: "", description: "" },
    variants: { nodes: variants, pageInfo: { hasNextPage: false } },
    media: { nodes: images, pageInfo: { hasNextPage: false } },
    metafields: { nodes: metafields, pageInfo: { hasNextPage: false } },
    readbackProvenance: "shopify_admin_live"
  };
}
export function normalizeCollection(raw) {
  if (!/^gid:\/\/shopify\/Collection\/[0-9]+$/.test(raw?.id || "")) fail("invalid_collection_gid");
  if (!raw.updatedAt || !raw.handle || !raw.title) fail("collection_identity_incomplete");
  const fields = nodes(raw.metafields, "collection_metafields");
  const products = nodes(raw.products, "collection_products");
  return {
    id: raw.id, handle: raw.handle, title: raw.title,
    updatedAt: raw.updatedAt, descriptionHtml: raw.descriptionHtml || "",
    seo: raw.seo || {}, image: raw.image || null, sortOrder: raw.sortOrder,
    templateSuffix: raw.templateSuffix,
    productGids: products.map((p) => p.id),
    metafields: fields,
    readbackProvenance: "shopify_admin_live"
  };
}
// Missing, explicitly cleared, and unchanged are different states.
export function resolveIncomingField({ registry, canonical, incoming, observedAt }) {
  if (!registry || !registry.active || registry.owner_type !== "PRODUCT") {
    return { action: "observe", reason: "unregistered_field" };
  }
  if (registry.source_of_truth === "derived" || registry.sync_direction === "none") {
    return { action: "observe", reason: "internal_only" };
  }
  if (!incoming || incoming.value === undefined) {
    return { action: "observe", reason: "not_in_readback" };
  }
  if (canonical?.dirty_for_shopify || canonical?.dirty_for_supabase) {
    return { action: "conflict", reason: "local_uncommitted_change" };
  }
  if (canonical?.validation_status === "valid" &&
      String(canonical.raw_value ?? "") === String(incoming.value ?? "")) {
    return { action: "noop", reason: "values_equal" };
  }
  // Product copy and product price follow the Supabase-approved SSOT;
  // Shopify edits are observed as review candidates, never discarded.
  if (registry.source_of_truth === "supabase") {
    return { action: "propose", reason: "supabase_canonical_preserved" };
  }
  const last = canonical?.shopify_updated_at ? Date.parse(canonical.shopify_updated_at) : 0;
  if (last && Date.parse(observedAt || incoming.updatedAt || 0) <= last) {
    return { action: "stale", reason: "older_shopify_version" };
  }
  return { action: "accept", reason: "shopify_owned_newer" };
}
export function approvedPhoto(job) {
  if (!job || job.status !== "sync_ready" || !job.reviewed_by || !job.reviewed_at) return false;
  if (job.output_sha256?.length !== 64 || job.input_sha256?.length !== 64) return false;
  if (job.approved_output_sha256 !== job.output_sha256 ||
      job.approved_input_sha256 !== job.input_sha256) return false;
  const checks = job.quality_checks || {};
  const provenance = job.provenance || {};
  return checks.rights_verified === true &&
    checks.product_identity_checked === true &&
    checks.visual_review_approved === true &&
    provenance.rights_verified === true &&
    Boolean(job.output_url);
}
export function authorizeOutbound({ operation, field, approval, expectedVersion, liveVersion, mediaJob }) {
  if (expectedVersion !== liveVersion) return { ok: false, reason: "version_conflict" };
  if (!approval?.reviewed_at || !approval?.reviewed_by || !approval?.approved) {
    return { ok: false, reason: "approval_missing" };
  }
  const protectedFields = ["status", "publications", "inventory", "inventoryPolicy", "brand", "theme"];
  if (protectedFields.includes(field)) return { ok: false, reason: "protected_field" };
  if (operation === "media_add") {
    return approvedPhoto(mediaJob) ? { ok: true } : { ok: false, reason: "media_gate_blocked" };
  }
  if (!["product_update", "variant_update", "metafields_upsert", "media_alt_update"].includes(operation)) {
    return { ok: false, reason: "operation_not_allowed" };
  }
  return { ok: true };
}
export async function verifyShopifyWebhook(rawBody, secret, suppliedHmac) {
  if (!secret || !suppliedHmac) return false;
  const enc = new TextEncoder();
  const secretKey = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", secretKey, enc.encode(rawBody)));
  const encoded = btoa(String.fromCharCode(...sig));
  const a = enc.encode(encoded), b = enc.encode(suppliedHmac.trim());
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
