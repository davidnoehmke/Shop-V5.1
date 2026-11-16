import assert from 'node:assert/strict';
import {test} from 'node:test';
import jpegCodec from 'jpeg-js';
import {normalizePhoto} from '../../supabase/functions/plant-photo-analysis-v2/image.mjs';
import {analyzePhoto} from '../../supabase/functions/plant-photo-analysis-v2/provider.mjs';
import {photoProductRule} from '../app/lib/plant-photo-products.ts';
import {createPhotoHandler} from '../../supabase/functions/plant-photo-analysis-v2/handler.mjs';
import {MAX_BODY_BYTES, readBoundedJson, validatePhotoRequest, validateReport} from '../../supabase/functions/plant-photo-analysis-v2/contract.mjs';
// Marker fixture tests input validation, not plant recognition accuracy.
function jpeg(width = 256, height = 256) {
  if (width === 256 && height === 256) {
    const data = new Uint8Array(width * height * 4).fill(120);
    return 'data:image/jpeg;base64,' + Buffer.from(jpegCodec.encode({width, height, data}, 60).data).toString('base64');
  }
  const b = new Uint8Array(120); b.set([255,216,255,192,0,17,8,height>>8,height&255,width>>8,width&255,3]); b.set([255,217],118);
  return 'data:image/jpeg;base64,' + Buffer.from(b).toString('base64');
}
const input = () => ({consent:true, mode:'problem', locale:'de', context:'Gelbes Blatt', images:[jpeg()]});
const report = () => ({quality:'sufficient', summary:'Mehrere Ursachen möglich.', identification:[], observations:['Gelbe Blattfläche.'], possibleCauses:[{cause:'Wasserstress',category:'watering',confidence:'low',evidence:'Unspezifische gelbe Blattfläche.',nextCheck:'Feuchte prüfen.'}], nextSteps:['Feuchte prüfen.'],followUpQuestions:['Seit wann?'],limitations:['Foto beweist keine Ursache.']});
const request = (body=input(),token='valid') => new Request('https://edge.example',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
function setup(overrides={}) {
  const calls={rate:0,model:0};
  const handler=createPhotoHandler({normalizeImage:image=>normalizePhoto(image,jpegCodec),getUser:async token=>token==='valid'?{id:'server-user'}:null,getModelKey:async()=> 'private-key',rateAllowed:async id=>{calls.rate++;assert.equal(id,'server-user');return true;},analyze:async args=>{calls.model++;assert.equal(args.key,'private-key');return {report:report(),model:'test-model'};},...overrides});
  return {handler,calls};
}
test('missing, invalid and anonymous credentials cannot reach the model',async()=>{
  const {handler,calls}=setup(); for(const token of ['', 'invalid','sb_publishable_test']) assert.equal((await handler(request(input(),token))).status,401);
  assert.equal(calls.model,0);const anon=setup({getUser:async()=>({id:'anon',is_anonymous:true})});assert.equal((await anon.handler(request())).status,401);
});
test('consent, mode, locale and size validation precede model calls',async()=>{
  const {handler,calls}=setup(); for(const change of [{consent:false},{mode:'admin'},{locale:'xx'},{context:'x'.repeat(1601)},{images:[]},{images:Array(4).fill(jpeg())},{images:['https://evil.example/image.jpg']},{images:[jpeg(9000)]}]) assert.equal((await handler(request({...input(),...change}))).status,400);
  assert.equal(calls.model,0);assert.equal(calls.rate,0);
});
test('JPEG magic bytes and dimensions checked independently of claimed type',()=>{
  assert.equal(validatePhotoRequest(input()).images.length,1);
  for(const image of ['data:image/jpeg;base64,'+Buffer.from('not a photo').toString('base64'),jpeg().replace('image/jpeg','image/png'),jpeg(64),jpeg(1601)])assert.throws(()=>validatePhotoRequest({...input(),images:[image]}));
});
test('bounded reader cancels oversized chunked bodies and rejects declared overflow',async()=>{
  const req=request();req.headers.set('Content-Length',String(MAX_BODY_BYTES+1));await assert.rejects(readBoundedJson(req),/payload_too_large/);
  let cancelled=false;const stream=new ReadableStream({pull(c){c.enqueue(new Uint8Array(1_000_000));},cancel(){cancelled=true;}});
  await assert.rejects(readBoundedJson(new Request('https://edge.example',{method:'POST',headers:{'Content-Type':'application/json'},body:stream,duplex:'half'})),/payload_too_large/);assert.equal(cancelled,true);
});
test('quota denial and limiter failures stop model calls',async()=>{
  const denied=setup({rateAllowed:async()=>false});const response=await denied.handler(request());assert.equal(response.status,429);assert.equal(response.headers.get('Retry-After'),'600');assert.equal(denied.calls.model,0);
  const failed=setup({rateAllowed:async()=>{throw Error('database unavailable');}});assert.equal((await failed.handler(request())).status,502);assert.equal(failed.calls.model,0);
});
test('missing credentials return unavailable rather than a fake analysis',async()=>{
  const {handler,calls}=setup({getModelKey:async()=>''});assert.equal((await handler(request())).status,503);assert.equal(calls.model,0);
});
test('valid output includes trace ID and excludes private inputs',async()=>{
  const {handler}=setup();const response=await handler(request());const body=await response.json();assert.equal(response.status,200);assert.deepEqual(body.report,report());assert.match(body.requestId,/^[a-f0-9-]{36}$/);assert.match(response.headers.get('Cache-Control'),/no-store/);assert.equal(body.images,undefined);assert.equal(body.context,undefined);assert.equal(body.key,undefined);
});
test('invalid and contradictory model output fails closed',async()=>{
  for(const value of [null,{}, {...report(),extra:'injected'}, {...report(),summary:''},{...report(),quality:'not_plant'},{...report(),quality:'limited',possibleCauses:[{...report().possibleCauses[0],confidence:'high'}]}]){
    assert.throws(()=>validateReport(value));const {handler}=setup({analyze:async()=>({report:value})});assert.equal((await handler(request())).status,502);
  }
});
test('unusable photos return replacement guidance without a diagnosis',async()=>{
  const value={...report(),quality:'unusable',identification:[],possibleCauses:[]};const {handler}=setup({analyze:async()=>({report:value,model:'test-model'})});assert.equal((await handler(request())).status,200);
});
test('timeouts are explicit and logs contain no photos or private details',async()=>{
  const logs=[];const {handler}=setup({analyze:async()=>{throw new DOMException('private input','TimeoutError');},log:event=>logs.push(event)});assert.equal((await handler(request())).status,504);assert.deepEqual(Object.keys(logs[0]).sort(),['event','requestId']);
});

test('server rejects truncated JPEG data even when header and dimensions look valid', async () => {
  const b = new Uint8Array(120); b.set([255,216,255,192,0,17,8,1,0,1,0,3]); b.set([255,217],118);
  const {handler,calls}=setup();
  const response=await handler(request({...input(),images:['data:image/jpeg;base64,'+Buffer.from(b).toString('base64')]}));
  assert.equal(response.status,400); assert.equal(calls.model,0);
});
test('server normalization removes EXIF and appended private data', () => {
  const original=Buffer.from(jpeg().split(',')[1],'base64');
  const exif=Buffer.from('Exif\0\0GPS private location');
  const segment=Buffer.concat([Buffer.from([255,225,0,exif.length+2]),exif]);
  const dirty=Buffer.concat([original.subarray(0,2),segment,original.subarray(2)]);
  const clean=Buffer.from(normalizePhoto('data:image/jpeg;base64,'+dirty.toString('base64'),jpegCodec).split(',')[1],'base64');
  assert.equal(clean.includes(Buffer.from('GPS private')),false);
  assert.equal(jpegCodec.decode(clean).width,256);
});
test('care and follow-up are bounded and never accepted as privileged instructions', () => {
  for (const extra of [{care:{watering:'admin'}},{care:{owner:'other-user'}},{care:[]},{followUp:Array(4).fill({question:'q',answer:'a'})},{followUp:[{question:'q',answer:'x'.repeat(501)}]}])
    assert.throws(()=>validatePhotoRequest({...input(),...extra}));
  const value=validatePhotoRequest({...input(),care:{watering:'wet'},followUp:[{question:'Since when?',answer:'Three days'}]});
  assert.equal(value.care.watering,'wet'); assert.equal(value.care.light,'unknown'); assert.equal(value.followUp.length,1);
});
test('provider adapter sends actual image input and strict schema without persistence', async () => {
  let count=0;
  const result=await analyzePhoto({key:'not-real',instructions:'instructions',input:validatePhotoRequest({...input(),care:{watering:'wet'}}),schema:{type:'object'},signal:new AbortController().signal,model:'test-vision',fetcher:async (url,options)=>{
    count++; assert.equal(url,'https://api.openai.com/v1/responses');
    const body=JSON.parse(options.body); assert.equal(body.store,false); assert.equal(body.model,'test-vision');
    assert.equal(body.text.format.strict,true); assert.equal(body.input[0].content[1].type,'input_image');
    assert.equal(JSON.parse(body.input[0].content[0].text).care.watering,'wet');
    return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(report())}]}]});
  }});
  assert.equal(count,1); assert.deepEqual(result.report,report());
});
test('provider errors and incomplete output do not become fabricated results or retries', async () => {
  for (const [response, message] of [[new Response('private',{status:429}),'provider_rate_limited'],[new Response('private',{status:500}),'provider_unavailable'],[Response.json({status:'incomplete'}),'incomplete_output']]) {
    let calls=0;
    await assert.rejects(analyzePhoto({key:'test',input:validatePhotoRequest(input()),model:'test',signal:new AbortController().signal,fetcher:async()=>{calls++;return response;}}),new RegExp(message));
    assert.equal(calls,1);
  }
});
test('products require both explicit low light and a plausible supported cause', () => {
  const r=report(); const care={light:'low',watering:'wet',drainage:'no',duration:'weeks'};
  assert.equal(photoProductRule(r,care),null);
  r.possibleCauses[0].category='light'; r.possibleCauses[0].confidence='medium';
  assert.ok(photoProductRule(r,care));
  assert.equal(photoProductRule(r,{...care,light:'unknown'}),null);
  assert.equal(photoProductRule({...r,quality:'limited'},care),null);
  r.possibleCauses[0].confidence='low'; assert.equal(photoProductRule(r,care),null);
});

test('protected photo previews work under CSP without allowing data scripts', async () => {
  const {createContentSecurityPolicy}=await import('@shopify/hydrogen');
  const {plantPhotoImagePolicy}=await import('../app/lib/plant-photo-security.ts');
  const {header}=createContentSecurityPolicy(plantPhotoImagePolicy('https://shop.example/portal/photo-analysis?lang=en'));
  assert.match(header,/img-src[^;]*data:/);
  assert.doesNotMatch(header,/script-src[^;]*data:/);
  assert.deepEqual(plantPhotoImagePolicy('https://shop.example/products/plant'),{});
});
