'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {route,links,findings,createRequester}=require('./live-links.cjs');
test('link audit follows internal content and skips commerce actions and files',()=>{
  assert.equal(route('/en/products/bims?variant=123#facts'),'/en/products/bims');
  for(const u of ['/cart/add','/checkout','https://other.example/pages/about','/cdn/a.js','/pages/guide.pdf'])assert.equal(route(u),null);
  assert.deepEqual(links('<a href="/pages/contact">Help</a><a href="/en/pages/contact">Help</a>','https://leaferservice.com/en/'),['/pages/contact','/en/pages/contact']);
});
test('every redirect and concurrent request shares the same throttle',async()=>{
  const events=[];
  const get=createRequester({interval:1000,pause:async ms=>events.push(`wait:${ms}`),fetchImpl:async(url,options)=>{
    events.push(new URL(url).pathname);
    assert.equal(options.redirect,'manual');
    return new Response('',new URL(url).pathname==='/old'?{status:302,headers:{location:'/new'}}:{status:200});
  }});
  const results=await Promise.all([get('https://leaferservice.com/old'),get('https://leaferservice.com/other')]);
  assert.equal(results[0].url,'https://leaferservice.com/new');
  assert.deepEqual(events,['wait:1000','/old','wait:1000','/other','wait:1000','/new']);
});
test('a long retry-after stays a failed, incomplete verification',async()=>{
  const get=createRequester({pause:async()=>{},fetchImpl:async()=>new Response('',{status:429,headers:{'retry-after':'120'}})});
  const response=await get('https://leaferservice.com/en/');
  assert.equal(response.status,429);
  assert.deepEqual(findings('/en/',response.status,response.url,response.html),['HTTP 429']);
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
