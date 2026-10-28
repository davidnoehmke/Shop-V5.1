import {FormEvent, useEffect, useMemo, useRef, useState} from 'react';
import {useLocation, useNavigate} from 'react-router';

type ChatMessage = {role: 'user' | 'assistant'; content: string};
type AssistantLink = {label: string; href: string};

const MAX_HISTORY = 6;
const SAFE_PREFIXES = ['/collections/', '/products/', '/blogs/', '/marken/', '/en/'];
const SAFE_EXACT = new Set(['/', '/search', '/cart', '/collections']);

function safePath(value: unknown) {
  if (typeof value !== 'string') return '';
  const raw = value.trim();
  if (!raw.startsWith('/') || raw.startsWith('//')) return '';
  try {
    const url = new URL(raw, 'https://leaferservice.com');
    if (url.origin !== 'https://leaferservice.com') return '';
    const path = url.pathname + url.search + url.hash;
    if (SAFE_EXACT.has(url.pathname) || SAFE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return path;
  } catch {}
  return '';
}

export function LeafAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('');
  const [links, setLinks] = useState<AssistantLink[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {role: 'assistant', content: 'Was möchtest du finden, verstehen oder auf der Seite erledigen?'},
  ]);
  const historyRef = useRef<ChatMessage[]>([]);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const responseRef = useRef<string | null>(null);
  const pendingTranscriptRef = useRef<{id: string; text: string} | null>(null);
  const cancelledRef = useRef(new Set<string>());
  const callsRef = useRef(new Set<string>());
  const turnRef = useRef(0);

  const locale = useMemo(() => location.pathname.startsWith('/en') ? 'en' : 'de', [location.pathname]);

  useEffect(() => {
    return () => stopVoice();
  }, []);

  function append(role: ChatMessage['role'], content: string) {
    const clean = content.trim().slice(0, 3000);
    if (!clean) return;
    setMessages((current) => [...current, {role, content: clean}].slice(-20));
    const next = [...historyRef.current, {role, content: clean}].slice(-MAX_HISTORY);
    historyRef.current = next;
  }

  async function api(body: Record<string, unknown>, signal?: AbortSignal) {
    const response = await fetch('/api/assistant', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({...body, locale, path: location.pathname}),
      signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || 'assistant_unavailable');
    return payload;
  }

  function executeNavigation(destination: unknown) {
    const path = safePath(destination);
    if (!path) return {ok: false, error: 'destination_not_allowed'};
    navigate(path);
    setOpen(false);
    return {ok: true, path};
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    append('user', message);
    setInput('');
    setBusy(true);
    setStatus('LEAF denkt …');
    try {
      const payload = await api({message, history: historyRef.current.slice(0, -1)});
      if (typeof payload.answer === 'string') append('assistant', payload.answer);
      setLinks(Array.isArray(payload.links) ? payload.links.filter((item: any) => safePath(item?.href)) : []);
    } catch {
      append('assistant', 'Das hat gerade nicht funktioniert. Versuch es bitte noch einmal.');
    } finally {
      setBusy(false);
      setStatus('');
    }
  }

  function sendRealtime(event: unknown) {
    if (channelRef.current?.readyState === 'open') channelRef.current.send(JSON.stringify(event));
  }

  async function handleToolCall(call: any) {
    if (!call?.call_id || callsRef.current.has(call.call_id)) return;
    callsRef.current.add(call.call_id);
    let output: any = {ok: false, error: 'unsupported_tool'};
    try {
      if (call.name === 'lookup_leaf_knowledge') {
        const args = JSON.parse(call.arguments || '{}');
        output = await api({action: 'knowledge_lookup', message: String(args.query || '').slice(0, 1600)});
      } else if (call.name === 'navigate_storefront') {
        const args = JSON.parse(call.arguments || '{}');
        output = executeNavigation(args.destination);
      } else if (call.name === 'read_leaf_article') {
        const args = JSON.parse(call.arguments || '{}');
        output = await api({
          action: 'article_read',
          message: 'read article',
          handle: String(args.handle || '').slice(0, 180),
          offset: Math.max(0, Number(args.offset) || 0),
        });
      }
    } catch {
      output = {ok: false, error: 'tool_failed'};
    }
    sendRealtime({
      type: 'conversation.item.create',
      item: {type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(output)},
    });
  }

  async function handleRealtimeEvent(event: any) {
    if (event.type === 'input_audio_buffer.speech_started') {
      turnRef.current += 1;
      if (responseRef.current) cancelledRef.current.add(responseRef.current);
      responseRef.current = null;
      pendingTranscriptRef.current = null;
      setStatus('Ich höre zu …');
    } else if (event.type === 'output_audio_buffer.started') {
      responseRef.current = event.response_id || null;
      setStatus('LEAF spricht …');
    } else if (event.type === 'conversation.item.input_audio_transcription.completed') {
      append('user', String(event.transcript || ''));
    } else if (event.type === 'response.output_audio_transcript.done' && !cancelledRef.current.has(event.response_id)) {
      pendingTranscriptRef.current = {id: event.response_id, text: String(event.transcript || '')};
    } else if (event.type === 'output_audio_buffer.stopped') {
      const pending = pendingTranscriptRef.current;
      if (pending?.id === event.response_id && !cancelledRef.current.has(event.response_id)) append('assistant', pending.text);
      pendingTranscriptRef.current = null;
      responseRef.current = null;
      setStatus('Ich höre zu …');
    } else if (event.type === 'response.done' && event.response?.status === 'completed') {
      const turn = turnRef.current;
      const calls = (event.response.output || []).filter((item: any) => item.type === 'function_call' && item.status === 'completed');
      for (const call of calls) await handleToolCall(call);
      if (calls.length && turn === turnRef.current) sendRealtime({type: 'response.create'});
    } else if (event.type === 'error') {
      setStatus('Sprachmodus nicht verfügbar');
    }
  }

  async function startVoice() {
    if (voiceActive) {
      stopVoice();
      return;
    }
    if (!window.RTCPeerConnection || !navigator.mediaDevices?.getUserMedia) {
      setStatus('Dieser Browser unterstützt den Realtime-Sprachmodus nicht.');
      return;
    }
    setOpen(true);
    setStatus('Sprachmodus wird verbunden …');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {echoCancellation: true, noiseSuppression: true, autoGainControl: true},
      });
      streamRef.current = stream;
      const peer = new RTCPeerConnection();
      peerRef.current = peer;
      const audio = document.createElement('audio');
      audio.autoplay = true;
      audio.setAttribute('playsinline', '');
      audioRef.current = audio;
      peer.ontrack = (event) => {
        audio.srcObject = event.streams[0];
        audio.play().catch(() => setStatus('Audiowiedergabe blockiert'));
      };
      stream.getAudioTracks().forEach((track) => peer.addTrack(track, stream));
      const channel = peer.createDataChannel('oai-events');
      channelRef.current = channel;
      channel.addEventListener('message', (event) => {
        try { void handleRealtimeEvent(JSON.parse(event.data)); } catch {}
      });
      channel.addEventListener('open', () => {
        setVoiceActive(true);
        setStatus('Ich höre zu …');
      });
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const payload = await api({
        action: 'voice_connect',
        sdp: offer.sdp,
        history: historyRef.current.slice(-MAX_HISTORY),
      });
      await peer.setRemoteDescription({type: 'answer', sdp: payload.sdp});
    } catch {
      stopVoice();
      setStatus('Sprachmodus konnte nicht gestartet werden.');
    }
  }

  function stopVoice() {
    channelRef.current?.close();
    peerRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
    }
    channelRef.current = null;
    peerRef.current = null;
    streamRef.current = null;
    audioRef.current = null;
    responseRef.current = null;
    pendingTranscriptRef.current = null;
    cancelledRef.current.clear();
    callsRef.current.clear();
    setVoiceActive(false);
    setStatus('');
  }

  return (
    <aside className="leaf-assistant" aria-label="LEAF Assistent">
      <button
        className="leaf-assistant__trigger"
        type="button"
        aria-expanded={open}
        aria-controls="leaf-assistant-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">LEAF</span>
        <span className="sr-only">Assistent öffnen</span>
      </button>

      {open ? (
        <section id="leaf-assistant-panel" className="leaf-assistant__panel" aria-live="polite">
          <header className="leaf-assistant__header">
            <div>
              <p className="page-eyebrow">LEAF · Finden, verstehen, navigieren</p>
              <h2>Wobei kann ich helfen?</h2>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Assistent schließen">×</button>
          </header>

          <div className="leaf-assistant__messages">
            {messages.map((message, index) => (
              <div className={'leaf-assistant__message leaf-assistant__message--' + message.role} key={index}>
                <strong>{message.role === 'assistant' ? 'LEAF' : 'Du'}</strong>
                <p>{message.content}</p>
              </div>
            ))}
          </div>

          {links.length ? (
            <div className="leaf-assistant__links" aria-label="Passende Inhalte">
              {links.map((link) => (
                <button key={link.href} type="button" onClick={() => executeNavigation(link.href)}>
                  {link.label}
                </button>
              ))}
            </div>
          ) : null}

          <form className="leaf-assistant__composer" onSubmit={submit}>
            <label htmlFor="leaf-assistant-input" className="sr-only">Nachricht an LEAF</label>
            <textarea
              id="leaf-assistant-input"
              rows={2}
              maxLength={1600}
              value={input}
              onChange={(event) => setInput(event.currentTarget.value)}
              placeholder="z. B. „Finde den Artikel über braune Flecken“"
            />
            <div className="leaf-assistant__actions">
              <button type="button" className={voiceActive ? 'is-active' : ''} onClick={() => void startVoice()}>
                {voiceActive ? 'Sprachmodus stoppen' : 'Mit LEAF sprechen'}
              </button>
              <button type="submit" disabled={busy || !input.trim()}>Senden</button>
            </div>
          </form>
          <p className="leaf-assistant__status" role="status">{status}</p>
          <p className="leaf-assistant__privacy">Ohne Login nutzbar. LEAF ist ein KI-Assistent und kein Mensch.</p>
        </section>
      ) : null}
    </aside>
  );
}
