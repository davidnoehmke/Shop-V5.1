'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {route,links,findings,requestGate}=require('./live-links.cjs');
test('link audit follows internal content and skips commerce actions and files',()=>{
  assert.equal(route('/en/products/bims?variant=123#facts'),'/en/products/bims');
  for(const u of ['/cart/add','/checkout','https://other.example/pages/about','/cdn/a.js','/pages/guide.pdf'])assert.equal(route(u),null);
  assert.deepEqual(links('<a href="/pages/contact">Help</a><a href="/en/pages/contact">Help</a>','https://leaferservice.com/en/'),['/pages/contact','/en/pages/contact']);
});
test('HTTP success cannot conceal homepage redirects or lost English locale',()=>{
  assert.deepEqual(findings('/en/collections/old',200,'https://leaferservice.com/',''),['Resource redirected to homepage','English link lost locale']);
  assert.deepEqual(findings('/pages/old',404,'https://leaferservice.com/pages/old',''),['HTTP 404']);
  assert.deepEqual(findings('/en/pages/old',200,'https://leaferservice.com/en/pages/new',''),[]);
});
test('render errors are checked in visible markup, excluding script literals',()=>{
  assert.deepEqual(findings('/',200,'https://leaferservice.com/','<script>"Translation missing:"</script>'),[]);
  assert.deepEqual(findings('/',200,'https://leaferservice.com/','<main>Liquid error: missing snippet</main>'),['Rendering error']);
});
test('a successful response from the wrong theme is not preview verification',()=>{
  assert.deepEqual(findings('/',200,'https://leaferservice.com/','<script>Shopify.theme = {"id":190364942721};</script>','190712709505'),['Expected preview theme was not rendered']);
  assert.deepEqual(findings('/',200,'https://leaferservice.com/','<script>Shopify.theme = {"id":190712709505};</script>','190712709505'),[]);
});
test('rate-limited pages are incomplete HTTP checks, not evidence of a wrong preview',()=>{
  assert.deepEqual(findings('/en/products/bims',429,'https://leaferservice.com/en/products/bims','Too many requests','190712709505'),['HTTP 429']);
});
test('one shared request gate spaces concurrent attempts and redirects',async()=>{
  let clock = 0;
  const starts = [];
  const gate = requestGate(1250, async ms => { clock += ms; }, () => clock);
  await Promise.all(Array.from({length:4},async()=>{await gate();starts.push(clock);}));
  await gate(); starts.push(clock);
  assert.equal(starts.length,5);
  for(let i=1;i<starts.length;i++) assert.ok(starts[i]-starts[i-1]>=1250);
});
