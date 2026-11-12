// Three editing channels, one canonical catalog. Pure validation/decision logic.
// This module NEVER writes to Shopify or Supabase. Only the authenticated
// catalog worker is permitted to persist/execute approved decisions.
import { PRODUCT_GID, VARIANT_GID, approvedPhoto } from "./core.mjs";

export const EDIT_CHANNELS = Object.freeze(["shopify", "chatgpt", "supabase"]);

const PRODUCT_FIELDS = new Set([
  "title", "descriptionHtml", "vendor", "productType", "tags",
  "seo.title", "seo.description"
]);
const VARIANT_FIELDS = new Set([
  "title", "sku", "price", "compareAtPrice", "weight", "barcode", "selectedOptions"
]);
const COLLECTION_FIELDS = new Set(["title", "descriptionHtml", "seo.title", "seo.description"]);
const CONTROLLED_FIELDS = new Set([
  "status", "publications", "salesChannels", "inventoryQuantity", "inventoryPolicy"
]);
const MEDIA_OPS = new Set(["add", "alt", "reorder", "remove", "replace"]);

function invalid(reason) { throw new Error("edit_intent:" + reason); }

function validateField(entity, field, registry) {
  if (entity === "product") {
    if (PRODUCT_FIELDS.has(field)) return { kind: "content", field };
    if (CONTROLLED_FIELDS.has(field)) return { kind: "controlled", field };
  }
  if (entity === "variant") {
    if (VARIANT_FIELDS.has(field)) return { kind: "variant", field };
    if (CONTROLLED_FIELDS.has(field)) return { kind: "controlled", field };
  }
  if (entity === "collection") {
    if (COLLECTION_FIELDS.has(field)) return { kind: "content", field };
    if (field === "image") return { kind: "media", operation: "replace", field };
  }
  if (entity === "metafield") {
    if (typeof field !== "string" || !/^[a-z0-9_]+\.[a-z0-9_]+$/.test(field))
      invalid("invalid_metafield_key");
    if (!registry || registry.active !== true || registry.owner_type !== "PRODUCT" ||
        registry.namespace + "." + registry.key !== field) invalid("metafield_not_registered");
    return { kind: "metafield", field, registryType: registry.data_type };
  }
  if (entity === "media") {
    if (!MEDIA_OPS.has(field)) invalid("invalid_media_operation");
    return { kind: "media", operation: field, field };
  }
  invalid("unsupported_field");
}

// ctx must come from a trusted server-side connector, NEVER from an arbitrary
// client JSON body. Webhook HMAC alone does not prove a human Shopify Admin edit.
function validateChannel(source, ctx) {
  if (!EDIT_CHANNELS.includes(source)) invalid("unknown_source");
  if (ctx?.trustedServer !== true) invalid("unauthenticated_context");
  if (source === "shopify" &&
      !(ctx.hmacVerified === true && ctx.fullReadback === true &&
        ctx.shopAllowlisted === true)) invalid("unverified_shopify_event");
  if (source === "chatgpt" &&
      !(ctx.userActionAuthorized === true && ctx.connectorAuthorized === true))
    invalid("chatgpt_action_not_authorized");
  if (source === "supabase" &&
      !(ctx.adminAuthorized === true && ctx.rlsOrServiceAuthorization === true))
    invalid("supabase_admin_not_authorized");
}
function isGid(entity, gid) {
  if (entity === "variant") return VARIANT_GID.test(gid);
  if (entity === "collection") return /^gid:\/\/shopify\/Collection\/[0-9]+$/.test(gid);
  return PRODUCT_GID.test(gid);
}

/**
 * A common command envelope for Shopify Admin, ChatGPT and Supabase Admin.
 * All three channels must carry the exact entity GID, field, pre-edit
 * revision, change origin, and trusted actor provenance.
 *
 * The worker computes before/after hashes and writes the durable audit row;
 * this function does not accept an unverified "already approved" flag.
 */
export function createEditIntent(command, ctx, registry = null) {
  if (!command || typeof command !== "object") invalid("missing_command");
  validateChannel(command.source, ctx);
  if (!["product", "variant", "collection", "metafield", "media"].includes(command.entity))
    invalid("unknown_entity");
  if (!isGid(command.entity, command.gid)) invalid("invalid_gid");
  const descriptor = validateField(command.entity, command.field, registry);
  if (!Object.hasOwn(command, "value")) invalid("missing_value");
  if (typeof command.expectedVersion !== "string" || !command.expectedVersion.trim())
    invalid("missing_expected_version");
  if (typeof command.changeId !== "string" ||
      !/^[a-zA-Z0-9][a-zA-Z0-9:._-]{7,127}$/.test(command.changeId)) invalid("invalid_idempotency_key");
  if (typeof ctx.actorId !== "string" || !ctx.actorId.trim()) invalid("missing_actor");
  return Object.freeze({
    channel: command.source,
    changeId: command.changeId,
    entity: command.entity,
    gid: command.gid,
    field: descriptor.field,
    kind: descriptor.kind,
    operation: descriptor.operation ?? "set",
    value: command.value,
    expectedVersion: command.expectedVersion,
    actorId: ctx.actorId,
    state: "pending_reconciliation",
    isApprovedForShopifyWrite: false,
    registeredType: descriptor.registryType ?? null
  });
}

export function routeEditIntent(intent, current, { registry = null, mediaJob = null } = {}) {
  if (!intent || intent.state !== "pending_reconciliation")
    return { outcome: "reject", reason: "intent_not_pending" };
  if (!current || current.version !== intent.expectedVersion)
    return { outcome: "conflict", reason: "version_changed" };
  if (current.pendingWrite === true || current.concurrentEdit === true)
    return { outcome: "conflict", reason: "concurrent_edit" };
  // A status change saved manually in Shopify can be observed and mirrored,
  // but a worker must NEVER issue an uncontrolled publication/status mutation.
  if (intent.kind === "controlled") {
    return intent.channel === "shopify" ?
      { outcome: "observe_only", reason: "shopify_controlled_state" } :
      { outcome: "manual_shopify_admin", reason: "protected_publication_or_inventory" };
  }
  if (intent.kind === "media") {
    if (!mediaJob || !approvedPhoto(mediaJob))
      return { outcome: "blocked", reason: "media_approval_missing" };
    return { outcome: "stage", reason: "approved_media_pending_live_readback" };
  }
  if (intent.kind === "metafield" &&
      (!registry || registry.active !== true || registry.data_type !== intent.registeredType))
    return { outcome: "reject", reason: "metafield_type_or_registry_changed" };
  // Shopify observations are never silently rejected. Fields still governed
  // by Supabase SSOT require reconciliation and (where material) approval.
  if (intent.channel === "shopify")
    return registry?.source_of_truth === "shopify" ?
      { outcome: "stage", reason: "shopify_owned_newer_value" } :
      { outcome: "review", reason: "shopify_change_to_canonical_field" };
  if (intent.channel === "chatgpt")
    return { outcome: "stage", reason: "user_directed_chatgpt_change_pending_worker" };
  if (intent.channel === "supabase")
    return { outcome: "stage", reason: "verified_supabase_admin_change_pending_worker" };
  return { outcome: "reject", reason: "unknown_channel" };
}
