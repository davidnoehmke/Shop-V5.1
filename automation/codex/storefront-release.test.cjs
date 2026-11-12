'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {inspect,routes}=require('./storefront-release.cjs');
function response(path,html,status=200){return {status,url:`https://leaferservice.com${path}`,html};}
test('release probes check both real product-world structures, independently of marketing headlines',()=>{
  const path='/en/collections/pflanzsubstrate-mischungen';
  const html='<html lang="en"><main><h1>A new headline</h1><article class="mix-highlight"></article></main></html>';
  assert.deepEqual(inspect(path,response(path,html)),[]);
  assert.deepEqual(inspect(path,response(path,html.replace('mix-highlight','old-grid'))),['Ready-made mix highlights not delivered']);
  const led='/collections/pflanzenbeleuchtung';
  assert.deepEqual(inspect(led,response(led,'<html lang="de"><main><h1>Licht</h1><article class="led-highlight"></article></main></html>')),[]);
  assert.ok(routes.includes('/collections/pflanzsubstrate-mischungen'));
  assert.ok(routes.includes('/collections/pflanzenbeleuchtung'));
});
test('translated route must retain its locale, render main content, and contain no Liquid errors',()=>{
 const path='/en/pages/test';
 const issues=inspect(path,{status:200,url:'https://leaferservice.com/pages/test',html:'<html lang="de"><main>Liquid error: broken</main>'});
 assert.ok(issues.includes('English link lost locale'));
 assert.ok(issues.includes('Rendering error'));
 assert.ok(issues.includes('Expected document language en, received de'));
 assert.ok(issues.includes('Main content or primary heading missing'));
});
