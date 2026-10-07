const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');

function runtime(key = '', vaultKey = '') {
  const requests = [];
  const chain = { select() { return this; }, not() { return this; }, in() { return this; }, order() { return this; }, limit() { return Promise.resolve({ data: [], error: null }); } };
  let handler;
  const scope = vm.createContext({
    Request, Response, TextEncoder, crypto: globalThis.crypto, AbortSignal, console,
    createClient: () => ({ from: () => chain, rpc: async name => ({ data: name === 'leaf_read_server_secret' ? vaultKey : true }) }),
    Deno: { env: { get: name => ({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-service', OPENAI_API_KEY: key })[name] }, serve: value => { handler = value; } },
    fetch: async (url, options) => {
      requests.push(JSON.parse(options.body));
      return Response.json({ output_text: 'Beobachtung: Grüne Blätter. Sicherheit: niedrig.' });
    }
  });
  const source = fs.readFileSync('supabase/functions/storefront-assistant/index.ts', 'utf8').replace(/^import .*;\n/gm, '');
  vm.runInContext(stripTypeScriptTypes(source), scope);
  return { requests, send: body => handler(new Request('https://example.test', { method: 'POST', headers: { origin: 'https://leaferservice.com', 'content-type': 'application/json' }, body: JSON.stringify(body) })) };
}

const photo = { dataUrl: 'data:image/jpeg;base64,' + Buffer.from('test-image').toString('base64') };

test('GitHub-provisioned vault credentials activate vision without returning a key to the browser', async () => {
  const app = runtime('', 'private-vault-key');
  const response = await app.send({ image: photo, locale: 'de' });
  const text = await response.text();
  assert.equal(JSON.parse(text).analysis_mode, 'plant_photo');
  assert.equal(app.requests.length, 1);
  assert.doesNotMatch(text, /private-vault-key/);
});

test('missing model credentials never claim image analysis or advertise diagnosis products', async () => {
  const app = runtime();
  const response = await app.send({ image: photo, locale: 'de' });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.capabilities.image_analysis, false);
  assert.equal(result.mode, 'approved_context');
  assert.match(result.answer, /Bildanalyse ist gerade nicht verfügbar/);
  assert.deepEqual(result.links, []);
  assert.equal(app.requests.length, 0);
});

test('configured runtime sends the photo and follow-up history to a supported vision model', async () => {
  const app = runtime('test-key');
  const response = await app.send({ message: 'Was soll ich prüfen?', image: photo, history: [{ role: 'user', content: 'Meine Alocasia hat Flecken.' }], locale: 'de' });
  const result = await response.json();
  assert.equal(result.analysis_mode, 'plant_photo');
  assert.equal(result.capabilities.image_analysis, true);
  assert.equal(app.requests[0].model, 'gpt-4.1-mini');
  assert.equal(app.requests[0].store, false);
  assert.equal(app.requests[0].input[1].content[1].type, 'input_image');
  assert.match(app.requests[0].instructions, /first turn only/);
});

function assistant() {
  let Assistant;
  const source = fs.readFileSync('snippets/leaf-shop-assistant.liquid', 'utf8').split('{% javascript %}')[1].split('{% endjavascript %}')[0];
  const window = { clearTimeout() {}, setTimeout() {}, speechSynthesis: { cancel() {}, getVoices: () => [], speak(value) { window.lastSpeech = value; } } };
  vm.runInNewContext(source, { HTMLElement: class {}, customElements: { get() {}, define(name, value) { Assistant = value; } }, window, SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } } });
  const instance = new Assistant();
  instance.dataset = { locale: 'de', welcome: 'Hallo, ich bin LEAF.' };
  instance.classList = { toggle() {} };
  instance.recognition = { abort() {} };
  return { instance, window };
}

test('voice greets before listening and resumes only after speech ends', () => {
  const { instance, window } = assistant();
  let resumes = 0;
  instance.resumeVoice = () => { resumes++; };
  instance.startVoice();
  assert.equal(window.lastSpeech.text, 'Hallo, ich bin LEAF.');
  assert.equal(window.lastSpeech.rate, .88);
  assert.equal(resumes, 0);
  window.lastSpeech.onend();
  assert.equal(resumes, 1);
});

test('stopping voice prevents a late speech completion from restarting listening', () => {
  const { instance, window } = assistant();
  let resumes = 0;
  instance.resumeVoice = () => { resumes++; };
  instance.startVoice();
  const pending = window.lastSpeech;
  instance.stopVoice();
  pending.onend();
  assert.equal(instance.voiceMode, false);
  assert.equal(resumes, 0);
});

test('a removed photo cannot reappear when asynchronous preparation completes', async () => {
  const { instance } = assistant();
  let finish;
  instance.photoInput = { files: [{ type: 'image/jpeg', size: 100, name: 'plant.jpg' }], value: '' };
  instance.preparePhoto = () => new Promise(resolve => { finish = resolve; });
  const pending = instance.selectPhoto();
  instance.clearPhoto();
  finish(photo.dataUrl);
  await pending;
  assert.equal(instance.photoDataUrl, '');
});
