'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {route,links,findings}=require('./live-links.cjs');
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
