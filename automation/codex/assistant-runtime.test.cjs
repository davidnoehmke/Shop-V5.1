const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');

function runtime(key = '', vaultKey = '', datasets = {}) {
  const requests = [];
  const from = name => {
    let rows = [...(datasets[name] || [])];
    return {
      select() { return this; },
      not(column, op, value) { rows = rows.filter(row => row[column] !== value && row[column] !== undefined); return this; },
      in(column, values) { rows = rows.filter(row => values.includes(row[column])); return this; },
      eq(column, value) { rows = rows.filter(row => row[column] === value); return this; },
      order() { return this; },
      range(start, end) { return Promise.resolve({ data: rows.slice(start, end + 1), error: null }); }
    };
  };
  let handler;
  const scope = vm.createContext({
    Request, Response, FormData, TextEncoder, crypto: globalThis.crypto, AbortSignal, console,
    createClient: () => ({ from, rpc: async name => ({ data: name === 'leaf_read_server_secret' ? vaultKey : true }) }),
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

function knowledgeFixture() {
  return {
    storefront_product_content: [{ product_gid: 'p1', handle: 'venso-indoor', canonical_title: 'Venso Indoor Plants', intro: 'UNVERIFIED-CANONICAL', verified_at: null }, { product_gid: 'draft', handle: 'venso-draft', canonical_title: 'Venso Draft', verified_at: '2026-10-07', intro: 'DRAFT-CONTENT' }],
    shopify_resource_snapshots: [{ resource_type: 'product', shopify_id: 'p1', status: 'ACTIVE', published: '2026-10-07' }, { resource_type: 'product', shopify_id: 'draft', status: 'DRAFT', published: null }],
    shopify_metafield_registry: [
      { owner_type: 'PRODUCT', namespace: 'lighting', key: 'recommended_distance', name: 'Abstand', data_type: 'multi_line_text_field', dynamic_role: 'care', active: true, storefront_visible: true },
      { owner_type: 'PRODUCT', namespace: 'lighting', key: 'safety_notes', name: 'Sicherheit', data_type: 'multi_line_text_field', dynamic_role: 'safety', active: true, storefront_visible: true },
      { owner_type: 'PRODUCT', namespace: 'procurement', key: 'margin', name: 'Marge', data_type: 'number_decimal', dynamic_role: 'commerce', active: true, storefront_visible: false }
    ],
    shopify_metafield_state: [
      { product_gid: 'p1', namespace: 'lighting', key: 'recommended_distance', parsed_value: '7 W: 30–40 cm; 15 W: 30–80 cm', validation_status: 'valid', synced_at: '2026-10-07', dirty_for_shopify: false },
      { product_gid: 'p1', namespace: 'lighting', key: 'safety_notes', parsed_value: '15-W-Variante nicht mit VEGA-Schirm kombinieren.', validation_status: 'valid', synced_at: '2026-10-07', dirty_for_shopify: false },
      { product_gid: 'p1', namespace: 'procurement', key: 'margin', parsed_value: 'PRIVATE-MARGIN', validation_status: 'valid', synced_at: '2026-10-07', dirty_for_shopify: false },
      { product_gid: 'p1', namespace: 'lighting', key: 'recommended_distance', parsed_value: 'STALE-OLD-DISTANCE', validation_status: 'stale', synced_at: '2026-10-07', dirty_for_shopify: false },
      { product_gid: 'p1', namespace: 'lighting', key: 'recommended_distance', parsed_value: 'UNSYNCED-DISTANCE', validation_status: 'valid', synced_at: '2026-10-07', dirty_for_shopify: true }
    ],
    knowledge_qa: [{ question: 'Venso secret', answer: 'PENDING-RESEARCH', approval_status: 'pending_review' }],
    information_blocks: [
      { statement: 'Venso', description: 'RESEARCHED-NOT-APPROVED', status: 'researched' },
      { statement: 'Venso', description: 'VALIDATED-PUBLIC-GUIDANCE', status: 'validated' }
    ]
  };
}

test('knowledge lookup uses synchronized public fields and excludes drafts, private, stale and unapproved data', async () => {
  const app = runtime('', '', knowledgeFixture());
  const response = await app.send({ action: 'knowledge_lookup', message: 'Welchen Abstand hat Venso Indoor Plants?' });
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.match(body, /30–40 cm/);
  assert.match(body, /VEGA/);
  assert.match(body, /VALIDATED-PUBLIC-GUIDANCE/);
  assert.doesNotMatch(body, /PRIVATE-MARGIN|UNVERIFIED-CANONICAL|DRAFT-CONTENT|STALE-OLD|UNSYNCED|PENDING-RESEARCH|RESEARCHED-NOT/);
});

test('validated collection guides are available while unvalidated research stays private', async () => {
  const app = runtime('', '', { collection_content: [
    { handle: 'pflanzenbeleuchtung', title: 'Pflanzenlicht', buying_guide: 'VALIDATED-COLLECTION-GUIDE', content_status: 'validated', validated_at: '2026-10-07' },
    { handle: 'pflanzenlicht-entwurf', title: 'Pflanzenlicht Entwurf', buying_guide: 'UNVALIDATED-COLLECTION-RESEARCH', content_status: 'researched', validated_at: null }
  ] });
  const body = await (await app.send({ message: 'Was muss ich bei Pflanzenlicht beachten?' })).json();
  assert.match(body.answer, /VALIDATED-COLLECTION-GUIDE/);
  assert.doesNotMatch(body.answer, /UNVALIDATED-COLLECTION-RESEARCH/);
});

test('fallback answers an actual technical question and retains the variant safety limitation', async () => {
  const app = runtime('', '', knowledgeFixture());
  const response = await app.send({ message: 'Welchen Abstand braucht Venso Indoor Plants?', locale: 'de' });
  const body = await response.json();
  assert.match(body.answer, /7 W: 30–40 cm; 15 W: 30–80 cm/);
  assert.match(body.answer, /nicht mit VEGA/);
  assert.equal(body.mode, 'approved_context');
});

test('published explanations compare both materials instead of returning a random product pitch', async () => {
  const datasets = { content_atoms: [
    { slug: 'bims', name: 'Bims', aliases: ['Pumice'], long_explanation: 'Bims ist dauerhaft strukturstabil und hält Luftporen offen.', active: true, shopify_metaobject_gid: 'public1' },
    { slug: 'perlite', name: 'Perlite', aliases: ['Perlit'], long_explanation: 'Perlite ist besonders leicht und kann nach oben wandern.', active: true, shopify_metaobject_gid: 'public2' }
  ] };
  const app = runtime('', '', datasets);
  const body = await (await app.send({ message: 'Was ist der Unterschied zwischen Bims und Perlite?' })).json();
  assert.match(body.answer, /strukturstabil/);
  assert.match(body.answer, /besonders leicht/);
});

test('retrieval includes explanations beyond a full database page', async () => {
  const content_atoms = Array.from({ length: 1001 }, (_, i) => ({ slug: `a${i}`, name: i === 1000 ? 'Bims' : 'Unrelated', long_explanation: i === 1000 ? 'LATEST-PAGE-FACT' : 'Other', active: true, shopify_metaobject_gid: `public${i}` }));
  const app = runtime('', '', { content_atoms });
  const body = await (await app.send({ message: 'Was macht Bims?' })).json();
  assert.match(body.answer, /LATEST-PAGE-FACT/);
});

test('relevant article passages after the old 1800-character prefix remain available', async () => {
  const app = runtime('', '', { content_articles: [{ id: 'a1', title: 'Lichtplanung', handle: 'licht', status: 'published', source_citations: ['https://example.test/lighting'], body_html: `<p>${'Einleitung ohne die konkrete Antwort. '.repeat(90)}</p><p>Alocasia braucht eine Standortprüfung und passende Beleuchtung; mehr Gießen ersetzt kein Licht.</p>` }] });
  const body = await (await app.send({ message: 'Was bedeutet Beleuchtung für Alocasia?' })).json();
  assert.match(body.answer, /mehr Gießen ersetzt kein Licht/);
});

test('follow-up retains the product context but does not invent a fixed quantity', async () => {
  const app = runtime('', '', knowledgeFixture());
  const body = await (await app.send({ message: 'Wie viel davon?', history: [{ role: 'user', content: 'Venso Indoor Plants' }, { role: 'user', content: 'Und im Winter?' }] })).json();
  assert.match(body.answer, /keine freigegebene feste Menge/);
  assert.match(body.answer, /Venso Indoor Plants/);
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
  const { instance, window, timers } = assistant();
  let resumes = 0;
  instance.resumeVoice = () => { resumes++; };
  await instance.startVoice();
  assert.equal(window.lastSpeech.rate, .78);
  assert.equal(instance.voiceFallback, true);
  assert.equal(resumes, 0);
  window.lastSpeech.onend();
  assert.equal(resumes, 0);
  timers.get(instance.voiceRestartTimer)();
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


test('unsourced and low-confidence knowledge stays out of model and fallback context', async () => {
  const app = runtime('key', '', {
    knowledge_qa: [
      { id: 'qa1', question: 'Bims Quellen', answer: 'Approved sourced answer.', approval_status: 'approved', source_refs: ['https://example.test/bims'], factuality_score: .95 },
      { id: 'qa2', question: 'Bims Quellen', answer: 'UNSOURCED', approval_status: 'approved', source_refs: [], factuality_score: 1 },
      { id: 'qa3', question: 'Bims Quellen', answer: 'LOW-CONFIDENCE', approval_status: 'approved', source_refs: ['https://example.test/bims'], factuality_score: .5 }
    ],
    content_articles: [
      { id: 'a1', title: 'Bims', body_html: '<p>UNSOURCED-ARTICLE</p>', status: 'published', source_citations: [] }
    ]
  });
  const response = await app.send({ message: 'Bims Quellen', locale: 'de' });
  assert.equal(response.status, 200);
  assert.match(app.requests[0].instructions, /Approved sourced answer/);
  assert.doesNotMatch(app.requests[0].instructions, /UNSOURCED|LOW-CONFIDENCE/);
});
