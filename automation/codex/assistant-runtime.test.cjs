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
    Request, Response, FormData, TextEncoder, crypto: globalThis.crypto, AbortSignal, console,
    createClient: () => ({ from: () => chain, rpc: async name => ({ data: name === 'leaf_read_server_secret' ? vaultKey : true }) }),
    Deno: { env: { get: name => ({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-service', OPENAI_API_KEY: key })[name] }, serve: value => { handler = value; } },
    fetch: async (url, options) => {
      if (url.endsWith('/realtime/calls')) {
        requests.push({ url, config: JSON.parse(options.body.get('session')), sdp: options.body.get('sdp') });
        return new Response('v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n');
      }
      requests.push({ url, ...JSON.parse(options.body) });
      return Response.json({ output_text: 'Bims hält die Mischung luftig. Welche Pflanze möchtest du umtopfen?' });
    }
  });
  const source = fs.readFileSync('supabase/functions/storefront-assistant/index.ts', 'utf8').replace(/^import .*;\n/gm, '');
  vm.runInContext(stripTypeScriptTypes(source), scope);
  return { requests, publicContext: scope.publicVoiceContext, send: body => handler(new Request('https://example.test', { method: 'POST', headers: { origin: 'https://leaferservice.com', 'content-type': 'application/json' }, body: JSON.stringify(body) })) };
}
const offer = 'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n';

test('images are rejected even with configured model credentials', async () => {
  const app = runtime('private-key');
  const response = await app.send({ image: { dataUrl: 'data:image/jpeg;base64,eA==' }, message: 'Analysiere das Bild' });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'images_disabled');
  assert.equal(app.requests.length, 0);
});

test('voice setup reports unavailable when no model credential is configured', async () => {
  const app = runtime();
  const response = await app.send({ action: 'voice_connect', sdp: offer, locale: 'de' });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'voice_unavailable');
  assert.equal(app.requests.length, 0);
});

test('server creates slow natural voice with automatic interruption and prior context without exposing credentials', async () => {
  const app = runtime('', 'private-vault-key');
  const response = await app.send({ action: 'voice_connect', sdp: offer, locale: 'de', history: [{ role: 'user', content: 'Meine Alocasia braucht ein neues Substrat.' }] });
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.equal(JSON.parse(text).capabilities.image_analysis, false);
  assert.doesNotMatch(text, /private-vault-key/);
  const { config } = app.requests[0];
  assert.equal(config.audio.output.voice, 'marin');
  assert.equal(config.audio.output.speed, .8);
  assert.equal(config.audio.input.turn_detection.interrupt_response, true);
  assert.equal(config.audio.input.turn_detection.type, 'semantic_vad');
  assert.match(config.instructions, /Alocasia/);
  assert.match(config.instructions, /lookup_leaf_knowledge before answering/);
});

test('voice accepts only bounded audio offers and does not create video calls', async () => {
  const app = runtime('key');
  const response = await app.send({ action: 'voice_connect', sdp: offer + 'm=video 9 UDP/TLS/RTP/SAVPF 96\r\n' });
  assert.equal(response.status, 400);
  assert.equal(app.requests.length, 0);
});

test('text replies retain follow-up context, use conversational instructions and never advertise image analysis', async () => {
  const app = runtime('key');
  const response = await app.send({ message: 'Wie viel davon?', history: [{ role: 'user', content: 'Was macht Bims?' }], locale: 'de' });
  const result = await response.json();
  assert.equal(result.capabilities.image_analysis, false);
  assert.equal(app.requests[0].store, false);
  assert.equal(app.requests[0].input[0].content, 'Was macht Bims?');
  assert.match(app.requests[0].instructions, /short, clear sentences/);
});

function assistant(extra = {}) {
  let Assistant;
  const source = fs.readFileSync('snippets/leaf-shop-assistant.liquid', 'utf8').split('{% javascript %}')[1].split('{% endjavascript %}')[0];
  const timers = new Map(); let timerId = 0;
  const window = { clearTimeout(id) { timers.delete(id); }, setTimeout(fn) { timers.set(++timerId, fn); return timerId; }, speechSynthesis: { cancel() {}, getVoices: () => [], speak(value) { window.lastSpeech = value; } } };
  vm.runInNewContext(source, { HTMLElement: class {}, customElements: { get() {}, define(name, value) { Assistant = value; } }, window, navigator: {}, location: { pathname: "/" }, DOMException, AbortController, AbortSignal, SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } }, ...extra });
  const instance = new Assistant();
  instance.dataset = { locale: 'de', welcome: 'Hallo, ich bin LEAF.', voiceListeningLabel: 'Ich höre zu.' };
  instance.classList = { toggle() {} };
  instance.recognition = { abort() {} };
  instance.voiceStatus = {};
  instance.history = [];
  instance.appendMessage = () => {};
  instance.saveHistory = () => {};
  return { instance, window, timers };
}

test('browser speech is slower and does not listen until the greeting ends', async () => {
  const { instance, window } = assistant();
  let resumes = 0;
  instance.resumeVoice = () => { resumes++; };
  await instance.startVoice();
  assert.equal(window.lastSpeech.rate, .78);
  assert.equal(instance.voiceFallback, true);
  assert.equal(resumes, 0);
  window.lastSpeech.onend();
  assert.equal(resumes, 1);
});

test('stopping voice prevents late speech events from restarting listening', async () => {
  const { instance, window } = assistant();
  let resumes = 0;
  instance.resumeVoice = () => { resumes++; };
  await instance.startVoice();
  const pending = window.lastSpeech;
  instance.stopVoice();
  pending.onend();
  assert.equal(instance.voiceMode, false);
  assert.equal(resumes, 0);
});

test('barge-in keeps the live connection and history, and discards the interrupted unplayed transcript', () => {
  const { instance } = assistant();
  const peer = instance.realtimePeer = {};
  instance.voiceMode = true; instance.voiceEpoch = 1; instance.realtimeTurn = 0;
  instance.realtimeCancelled = new Set();
  instance.realtimeResponse = 'response-old';
  instance.history.push({ role: 'user', content: 'Was macht Bims?' });
  instance.handleRealtimeEvent({ type: 'input_audio_buffer.speech_started' }, 1);
  instance.handleRealtimeEvent({ type: 'response.output_audio_transcript.done', response_id: 'response-old', transcript: 'Ungehörter Rest der alten Antwort.' }, 1);
  instance.handleRealtimeEvent({ type: 'output_audio_buffer.stopped', response_id: 'response-old' }, 1);
  instance.handleRealtimeEvent({ type: 'conversation.item.input_audio_transcription.completed', transcript: 'Und für meine Alocasia?' }, 1);
  assert.equal(instance.realtimePeer, peer);
  assert.equal(instance.voiceMode, true);
  assert.equal(instance.voiceActive, true);
  assert.equal(instance.history.length, 2);
  assert.equal(instance.history[1].content, 'Und für meine Alocasia?');
});

test('stop closes the peer and releases the microphone; stale events do not change history', () => {
  const { instance } = assistant();
  let stopped = 0, closed = 0;
  instance.voiceMode = true; instance.voiceEpoch = 1;
  instance.realtimePeer = { close() { closed++; } };
  instance.realtimeStream = { getTracks: () => [{ stop() { stopped++; } }] };
  instance.stopVoice();
  instance.handleRealtimeEvent({ type: 'conversation.item.input_audio_transcription.completed', transcript: 'stale' }, 1);
  assert.equal(stopped, 1);
  assert.equal(closed, 1);
  assert.equal(instance.history.length, 0);
});

test('late knowledge lookup after an interruption does not trigger an outdated spoken response', async () => {
  let finish;
  const { instance } = assistant({ fetch: () => new Promise(resolve => { finish = resolve; }) });
  const sent = [];
  instance.voiceMode = true; instance.voiceEpoch = 1; instance.realtimeTurn = 0;
  instance.realtimeCalls = new Set();
  instance.sendRealtime = event => sent.push(event);
  const pending = instance.realtimeLookup([{ call_id: 'call-1', arguments: '{"query":"Bims"}' }], 1);
  instance.realtimeTurn++;
  finish(Response.json({ context: { knowledge: [] } }));
  await pending;
  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, 'conversation.item.create');
});

test('microphone obtained after the user stopped is immediately released', async () => {
  let finish, stopped = 0;
  const { instance } = assistant({ navigator: { mediaDevices: { getUserMedia: () => new Promise(resolve => { finish = resolve; }) } } });
  instance.isConnected = true;
  const pending = instance.startRealtimeVoice();
  instance.stopVoice();
  finish({ getTracks: () => [{ stop() { stopped++; } }] });
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(stopped, 1);
});

test('late buffer events from an interrupted answer cannot reset a newer answer', () => {
  const { instance } = assistant();
  instance.voiceMode = true; instance.voiceEpoch = 1;
  instance.realtimeCancelled = new Set(['old']);
  instance.realtimeResponse = 'new'; instance.voiceSpeaking = true;
  instance.realtimePending = { id: 'new', text: 'Neue Antwort.' };
  instance.handleRealtimeEvent({ type: 'output_audio_buffer.cleared', response_id: 'old' }, 1);
  instance.handleRealtimeEvent({ type: 'output_audio_buffer.stopped', response_id: 'old' }, 1);
  assert.equal(instance.voiceSpeaking, true);
  assert.equal(instance.realtimePending.text, 'Neue Antwort.');
});

test('WebRTC setup uses only the store backend and starts listening without replaying a greeting in an existing conversation', async () => {
  let handlers = {}, request;
  const channel = { readyState: 'open', addEventListener(name, fn) { handlers[name] = fn; }, send() { throw new Error('No repeated greeting expected'); } };
  const stream = { getAudioTracks: () => [{}], getTracks: () => [] };
  const { instance, window } = assistant({
    navigator: { mediaDevices: { getUserMedia: async () => stream } },
    document: { createElement: () => ({ setAttribute() {} }) },
    fetch: async (url, options) => { request = { url, body: JSON.parse(options.body) }; return Response.json({ sdp: offer }); }
  });
  window.RTCPeerConnection = class { addTrack() {} createDataChannel() { return channel; } async createOffer() { return { sdp: offer }; } async setLocalDescription() {} async setRemoteDescription(value) { this.remote = value; } };
  instance.append = () => {};
  instance.isConnected = true; instance.endpoint = 'https://store-backend.test';
  instance.history = [{ role: 'user', content: 'Was macht Bims?' }];
  await instance.startRealtimeVoice();
  handlers.open();
  assert.equal(request.url, instance.endpoint);
  assert.equal(request.body.action, 'voice_connect');
  assert.equal(request.body.history[0].content, 'Was macht Bims?');
  assert.equal(instance.voiceStarting, false);
  assert.equal(instance.voiceActive, true);
  assert.equal(instance.realtimePeer.remote.type, 'answer');
});

 test('voice knowledge exposes approved answers without internal SEO or verification metadata', () => {
  const app = runtime();
  const context = app.publicContext({
    products: [{ handle: 'bims', canonical_title: 'Bims', intro: 'Luftige Mischung.', evidence: 'private-review', verified_at: 'private-timestamp' }],
    knowledge: [{ question: 'Was macht Bims?', answer: 'Bims lockert die Mischung.', long_tail_keywords: ['internal-strategy'], source_refs: ['private-review-url'] }],
    articles: [{ title: 'Substrat', body: 'Bims hilft.', primary_keyword: 'internal-strategy' }]
  });
  const serialized = JSON.stringify(context);
  assert.match(serialized, /Bims lockert die Mischung/);
  assert.doesNotMatch(serialized, /internal-strategy|private-review|private-timestamp/);
});
