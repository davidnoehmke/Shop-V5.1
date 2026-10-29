#!/usr/bin/env node
// Read-only supplier catalog validation. Does not access Shopify or publish products.
// Input: normalized CSV with columns family,title,color,sku,ean,rrp,pack_size
import fs from 'node:fs';
const file=process.argv[2];
if(!file){console.error('Usage: node headless/scripts/elho-import.mjs <normalized.csv>');process.exit(2)}
function csv(text){const lines=[];let row=[],field='',quote=false;for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quote&&text[i+1]==='"'){field+='"';i++}else quote=!quote}else if(ch===','&&!quote){row.push(field);field=''}else if((ch==='\n'||ch==='\r')&&!quote){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(Boolean))lines.push(row);row=[];field=''}else field+=ch}if(field||row.length){row.push(field);lines.push(row)}return lines}
const [headers,...records]=csv(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const normalized=headers.map(h=>h.trim().toLowerCase());
const at=(row,key)=>row[normalized.indexOf(key)]?.trim()||'';
const errors=[],families=new Map(),skus=new Set(),eans=new Set(),variants=[];
for(const [i,row] of records.entries()){
 const n=i+2,sku=at(row,'sku')||at(row,'article_number'),ean=at(row,'ean'),family=at(row,'family'),title=at(row,'title'),color=at(row,'color');
 if(!sku||!ean||!family||!title){errors.push({row:n,reason:'missing required sku/ean/family/title'});continue}
 if(!/^\d{8,14}$/.test(ean))errors.push({row:n,reason:'invalid EAN format'});
 if(skus.has(sku))errors.push({row:n,reason:'duplicate SKU'});
 if(eans.has(ean))errors.push({row:n,reason:'duplicate EAN'});
 skus.add(sku);eans.add(ean);
 const item={sku,ean,title,color,series:family,sourceRow:n,status:'needs_image_and_specs_review'};
 variants.push(item);families.set(family,(families.get(family)||0)+1);
}
const report={source:file,rows:records.length,validMappedVariants:variants.length,series:families.size,errors,blockedFromPublishing:true,missingImages:variants.length,itemsBySeries:Object.fromEntries([...families].sort(([a],[b])=>a.localeCompare(b)))};
console.log(JSON.stringify(report,null,2));
if(errors.length)process.exitCode=1;
