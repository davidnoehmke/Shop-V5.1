import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProduct, resolveIncomingField, approvedPhoto, authorizeOutbound, verifyShopifyWebhook } from "./core.mjs";

const base = {
 id: "gid://shopify/Product/123",handle:"abc",title:"Product",status:"DRAFT",
 updatedAt:"2026-10-11T10:00:00Z",vendor:"LEAF",productType:"Test",
 variants:{pageInfo:{hasNextPage:false},nodes:[{id:"gid://shopify/ProductVariant/456",updatedAt:"2026-10-11T10:00:00Z",price:"19.99"}]},
 media:{pageInfo:{hasNextPage:false},nodes:[{id:"gid://shopify/MediaImage/789",alt:"Exact product",image:{url:"https://example.org/product.jpg",width:2000,height:2000}}]},
 metafields:{pageInfo:{hasNextPage:false},nodes:[{id:"gid://shopify/Metafield/2",namespace:"leafer",key:"intro",type:"multi_line_text_field",value:"Intro",updatedAt:"2026-10-11T10:00:00Z"}]}
};
test("all Shopify media and metadata persist in normalized complete readback",()=>{
 const p=normalizeProduct(base);
 assert.equal(p.media.nodes.length,1);
 assert.equal(p.media.nodes[0].alt,"Exact product");
 assert.equal(p.metafields.nodes[0].key,"intro");
 assert.equal(p.variants.nodes[0].price,"19.99");
});
test("pagination gaps are rejected; never silently delete omitted images",()=>{
 assert.throws(()=>normalizeProduct({...base,media:{...base.media,pageInfo:{hasNextPage:true}}}),/incomplete/);
});
test("not reading a field cannot clear it",()=>{
 assert.equal(resolveIncomingField({registry:{owner_type:"PRODUCT",active:true,source_of_truth:"shopify"},canonical:null,incoming:null}).action,"observe");
});
test("Supabase canonical text cannot be overwritten by Shopify",()=>{
 assert.equal(resolveIncomingField({registry:{owner_type:"PRODUCT",active:true,source_of_truth:"supabase",sync_direction:"to_shopify"},canonical:{raw_value:"Newest canonical"},incoming:{value:"Older content"}}).action,"propose");
});
test("uncommitted changes and stale versions always stop automatic writes",()=>{
 assert.equal(resolveIncomingField({registry:{owner_type:"PRODUCT",active:true,source_of_truth:"shopify"},canonical:{dirty_for_shopify:true},incoming:{value:"X"}}).action,"conflict");
 assert.equal(resolveIncomingField({registry:{owner_type:"PRODUCT",active:true,source_of_truth:"shopify"},canonical:{shopify_updated_at:"2026-10-11T12:00:00Z"},incoming:{value:"X"},observedAt:"2026-10-11T11:00:00Z"}).action,"stale");
});
test("unauthorized media is never publishable",()=>{
 assert.equal(approvedPhoto({status:"sync_ready",reviewed_by:"staff",reviewed_at:"now",input_sha256:"a".repeat(64),output_sha256:"b".repeat(64),approved_input_sha256:"a".repeat(64),approved_output_sha256:"b".repeat(64),quality_checks:{rights_verified:false,product_identity_checked:true,visual_review_approved:true},provenance:{rights_verified:true},output_url:"https://example.org/a.jpg"}),false);
});
test("status cannot be changed even when supplied with an approval",()=>{
 assert.deepEqual(authorizeOutbound({operation:"product_update",field:"status",approval:{approved:true,reviewed_at:"now",reviewed_by:"staff"},expectedVersion:"v1",liveVersion:"v1"}),{ok:false,reason:"protected_field"});
});
test("version conflict wins over approval",()=>{
 assert.equal(authorizeOutbound({operation:"product_update",field:"descriptionHtml",approval:{approved:true,reviewed_at:"now",reviewed_by:"staff"},expectedVersion:"v1",liveVersion:"v2"}).ok,false);
});
test("HMAC requires raw request body and Shopify shared secret",async()=>{
 const body=JSON.stringify({id:123});
 const secret="only-in-secure-server";
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const sig=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(body)));
 const mac=btoa(String.fromCharCode(...sig));
 assert.equal(await verifyShopifyWebhook(body,secret,mac),true);
 assert.equal(await verifyShopifyWebhook(body+" ",secret,mac),false);
 assert.equal(await verifyShopifyWebhook(body,secret,"invalid"),false);
});
