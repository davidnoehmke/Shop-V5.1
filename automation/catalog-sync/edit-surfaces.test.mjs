import test from "node:test";
import assert from "node:assert/strict";
import { createEditIntent, routeEditIntent, EDIT_CHANNELS } from "./edit-surfaces.mjs";

const gid = "gid://shopify/Product/12345678";
const version = "2026-10-11T12:50:00Z";
const basic = {
  entity: "product", gid, field: "descriptionHtml", value: "<p>Neue Beschreibung</p>",
  expectedVersion: version, changeId: "product-edit:01:abc"
};
const contexts = {
  shopify: { trustedServer: true, hmacVerified: true, fullReadback: true, shopAllowlisted: true, actorId: "shopify-app" },
  chatgpt: { trustedServer: true, userActionAuthorized: true, connectorAuthorized: true, actorId: "chatgpt-user" },
  supabase: { trustedServer: true, adminAuthorized: true, rlsOrServiceAuthorization: true, actorId: "supabase-admin" }
};
const make = (source, overrides = {}, context = contexts[source], registry = null) =>
  createEditIntent({ ...basic, source, ...overrides }, context, registry);

test("three and only three editing surfaces are supported", () => {
  assert.deepEqual(EDIT_CHANNELS, ["shopify", "chatgpt", "supabase"]);
  for (const source of EDIT_CHANNELS) {
    const intent = make(source);
    assert.equal(intent.channel, source);
    assert.equal(intent.isApprovedForShopifyWrite, false);
    assert.equal(intent.state, "pending_reconciliation");
  }
  assert.throws(() => make("guest", {}, { trustedServer: true, actorId: "guest" }), /unknown_source/);
});

test("Shopify webhook requires HMAC, complete readback, allowlisted store and server trust", () => {
  assert.throws(() => make("shopify", {}, { ...contexts.shopify, hmacVerified: false }), /unverified_shopify_event/);
  assert.throws(() => make("shopify", {}, { ...contexts.shopify, fullReadback: false }), /unverified_shopify_event/);
  assert.throws(() => make("shopify", {}, { ...contexts.shopify, trustedServer: false }), /unauthenticated_context/);
});

test("ChatGPT requires explicit permission and an authorized connector", () => {
  assert.throws(() => make("chatgpt", {}, { ...contexts.chatgpt, userActionAuthorized: false }), /chatgpt_action_not_authorized/);
  assert.throws(() => make("chatgpt", {}, { ...contexts.chatgpt, connectorAuthorized: false }), /chatgpt_action_not_authorized/);
});
test("Supabase edits require privileged, server-verified admin identity", () => {
  assert.throws(() => make("supabase", {}, { ...contexts.supabase, adminAuthorized: false }), /supabase_admin_not_authorized/);
  assert.throws(() => make("supabase", {}, { ...contexts.supabase, rlsOrServiceAuthorization: false }), /supabase_admin_not_authorized/);
});
test("all changes require exact identifier, field, actor, idempotency and expected revision", () => {
  assert.throws(() => make("shopify", { gid: "product-123" }), /invalid_gid/);
  assert.throws(() => make("chatgpt", { expectedVersion: "" }), /missing_expected_version/);
  assert.throws(() => make("supabase", { changeId: "a" }), /invalid_idempotency_key/);
  assert.throws(() => make("chatgpt", { field: "maliciousAction" }), /unsupported_field/);
});
test("Shopify incoming edit to Supabase canonical is reviewed, not discarded", () => {
  const intent = make("shopify");
  assert.deepEqual(routeEditIntent(intent, { version }), {
    outcome: "review", reason: "shopify_change_to_canonical_field"
  });
});
test("Shopify-owned registry fields may stage immediately if revision is current", () => {
  const reg = { owner_type: "PRODUCT", active: true, namespace: "custom", key: "feature", data_type: "single_line_text_field", source_of_truth: "shopify" };
  const intent = make("shopify", { entity: "metafield", field: "custom.feature" }, contexts.shopify, reg);
  assert.equal(routeEditIntent(intent, { version }, { registry: reg }).outcome, "stage");
});
test("ChatGPT and Supabase both stage edits for the same protected reconciliation worker", () => {
  for (const channel of ["chatgpt", "supabase"]) {
    assert.equal(routeEditIntent(make(channel), { version }).outcome, "stage");
  }
});
test("stale edits and concurrent edits cannot silently overwrite newer product data", () => {
  assert.equal(routeEditIntent(make("chatgpt"), { version: "2026-10-11T12:59:00Z" }).outcome, "conflict");
  assert.equal(routeEditIntent(make("supabase"), { version, concurrentEdit: true }).outcome, "conflict");
  assert.equal(routeEditIntent(make("shopify"), { version, pendingWrite: true }).outcome, "conflict");
});
test("status and publications are readback-only from Shopify and manual elsewhere", () => {
  assert.equal(routeEditIntent(make("shopify", { field: "status", value: "ACTIVE" }), { version }).outcome, "observe_only");
  assert.equal(routeEditIntent(make("chatgpt", { field: "status", value: "ACTIVE" }), { version }).outcome, "manual_shopify_admin");
  assert.equal(routeEditIntent(make("supabase", { field: "inventoryPolicy", value: "continue" }), { version }).outcome, "manual_shopify_admin");
});
test("all media changes require image-rights and visual authorization before staging", () => {
  const mediaIntent = make("chatgpt", { entity: "media", field: "add", value: "https://example.org/photo.jpg" });
  assert.equal(routeEditIntent(mediaIntent, { version }, { mediaJob: null }).outcome, "blocked");
  const photo = {
    status: "sync_ready", reviewed_by: "staff", reviewed_at: "2026-10-11T13:00:00Z",
    input_sha256: "a".repeat(64), output_sha256: "b".repeat(64),
    approved_input_sha256: "a".repeat(64), approved_output_sha256: "b".repeat(64),
    quality_checks: { rights_verified: true, product_identity_checked: true, visual_review_approved: true },
    provenance: { rights_verified: true }, output_url: "https://example.org/approved.jpg"
  };
  assert.equal(routeEditIntent(mediaIntent, { version }, { mediaJob: photo }).outcome, "stage");
});
test("typed metafields must remain registered to prevent unverified column injection", () => {
  assert.throws(() => make("supabase", { entity: "metafield", field: "unregistered.new" }), /metafield_not_registered/);
  const registry = { owner_type: "PRODUCT", namespace: "leafer", key: "faq", data_type: "json", active: true };
  const intent = make("supabase", { entity: "metafield", field: "leafer.faq", value: [] }, contexts.supabase, registry);
  assert.equal(routeEditIntent(intent, { version }, { registry: { ...registry, data_type: "single_line_text_field" } }).outcome, "reject");
});
