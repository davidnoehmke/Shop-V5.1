import {useEffect, useRef, useState} from 'react';
import type {CSSProperties, FormEvent, PointerEvent as ReactPointerEvent} from 'react';
import {useLocation, useNavigate} from 'react-router';
import {ASSISTANT_COPY, type AssistantStatus} from '~/lib/assistant-copy';
import {localizedPath} from '~/lib/locale-path';

type ChatMessage = {role: 'user' | 'assistant'; content: string};
type AssistantLink = {label: string; href: string};
type Position = {x: number; y: number};

const MAX_HISTORY = 12;
const SAFE_PREFIXES = ['/collections/', '/products/', '/blogs/', '/marken/', '/welten/', '/pages/', '/policies/', '/en/'];
const SAFE_EXACT = new Set(['/', '/search', '/cart', '/collections']);
const DRAG_STEP = 24;

function safePath(value: unknown) {
  if (typeof value !== 'string') return '';
  const raw = value.trim();
  if (!raw.startsWith('/') || raw.startsWith('//')) return '';
  try {
    const url = new URL(raw, 'https://leaferservice.com');
    if (url.origin !== 'https://leaferservice.com') return '';
    const path = url.pathname + url.search + url.hash;
    if (SAFE_EXACT.has(url.pathname) || SAFE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return path;
  } catch {
    return '';
  }
  return '';
}

export function LeafAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const locale = location.pathname === '/en' || location.pathname.startsWith('/en/') ? 'en' : 'de';
  const text = ASSISTANT_COPY[locale];
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState<Position>({x: 0, y: 0});
  const [voiceActive, setVoiceActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<AssistantStatus | ''>('');
  const statusText = status ? text.statuses[status] : '';
  const [links, setLinks] = useState<AssistantLink[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const historyRef = useRef<ChatMessage[]>([]);
  const dragRef = useRef<{pointerId: number; clientX: number; clientY: number; position: Position} | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const responseRef = useRef<string | null>(null);
  const pendingTranscriptRef = useRef<{id: string; text: string} | null>(null);
  const cancelledRef = useRef(new Set<string>());
  const callsRef = useRef(new Set<string>());
  const turnRef = useRef(0);

  const assistantStyle = {'--leaf-assistant-x': `${position.x}px`, '--leaf-assistant-y': `${position.y}px`} as CSSProperties;

  useEffect(() => {
    const openAssistant = () => {
      setOpen(true);
      setMinimized(false);
    };
    window.addEventListener('leaf:assistant:open', openAssistant);
    return () => {
      window.removeEventListener('leaf:assistant:open', openAssistant);
      stopVoice();
    };
  }, []);

  function clampPosition(next: Position) {
    if (typeof window === 'undefined') return next;
    const keepVisible = 88;
    const maxX = Math.max(0, window.innerWidth - keepVisible);
    const maxY = Math.max(0, window.innerHeight - keepVisible);
    return {
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    };
  }

  function beginDrag(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      position,
    };
  }

  function drag(event: ReactPointerEvent<HTMLElement>) {
    const active = dragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    setPosition(clampPosition({
      x: active.position.x + event.clientX - active.clientX,
      y: active.position.y + event.clientY - active.clientY,
    }));
  }

  function endDrag(event: ReactPointerEvent<HTMLElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function moveWithKeyboard(event: React.KeyboardEvent<HTMLElement>) {
    let dx = 0;
    let dy = 0;
    if (event.key === 'ArrowLeft') dx = -DRAG_STEP;
    if (event.key === 'ArrowRight') dx = DRAG_STEP;
    if (event.key === 'ArrowUp') dy = -DRAG_STEP;
    if (event.key === 'ArrowDown') dy = DRAG_STEP;
    if (!dx && !dy) return;
    event.preventDefault();
    setPosition((current) => clampPosition({x: current.x + dx, y: current.y + dy}));
  }

  function append(role: ChatMessage['role'], content: string) {
    const clean = content.trim().slice(0, 3000);
    if (!clean) return;
    setMessages((current) => [...current, {role, content: clean}].slice(-20));
    const next = [...historyRef.current, {role, content: clean}].slice(-MAX_HISTORY);
    historyRef.current = next;
  }

  async function api(body: Record<string, unknown>, signal?: AbortSignal): Promise<any> {
    const response = await fetch('/api/assistant', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({...body, locale, path: location.pathname}),
      signal,
    });
    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || 'assistant_unavailable');
    return payload;
  }

  function executeNavigation(destination: unknown) {
    const destinationPath = safePath(destination);
    if (!destinationPath) return {ok: false, error: 'destination_not_allowed'};
    const path = localizedPath(destinationPath, location.pathname);
    void navigate(path);
    if (!voiceActive) {
      setOpen(false);
      setMinimized(false);
    } else {
      setMinimized(true);
    }
    return {ok: true, path};
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    append('user', message);
    setInput('');
    setBusy(true);
    setStatus('thinking');
    try {
      const payload = await api({message, history: historyRef.current.slice(0, -1)});
      if (typeof payload.answer === 'string') append('assistant', payload.answer);
      setLinks(Array.isArray(payload.links) ? payload.links.filter((item: any) => safePath(item?.href)) : []);
    } catch {
      append('assistant', text.retry);
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
        const args: any = JSON.parse(call.arguments || '{}');
        output = await api({action: 'knowledge_lookup', message: String(args.query || '').slice(0, 1600)});
      } else if (call.name === 'navigate_storefront') {
        const args: any = JSON.parse(call.arguments || '{}');
        output = executeNavigation(args.destination);
      } else if (call.name === 'read_leaf_article') {
        const args: any = JSON.parse(call.arguments || '{}');
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
      setStatus('listening');
    } else if (event.type === 'output_audio_buffer.started') {
      responseRef.current = event.response_id || null;
      setStatus('speaking');
    } else if (event.type === 'conversation.item.input_audio_transcription.completed') {
      append('user', String(event.transcript || ''));
    } else if (event.type === 'response.output_audio_transcript.done' && !cancelledRef.current.has(event.response_id)) {
      pendingTranscriptRef.current = {id: event.response_id, text: String(event.transcript || '')};
    } else if (event.type === 'output_audio_buffer.stopped') {
      const pending = pendingTranscriptRef.current;
      if (pending && pending.id === event.response_id && !cancelledRef.current.has(event.response_id)) {
        append('assistant', pending.text);
      }
      pendingTranscriptRef.current = null;
      responseRef.current = null;
      setStatus('listening');
    } else if (event.type === 'response.done' && event.response?.status === 'completed') {
      const turn = turnRef.current;
      const calls = (event.response.output || []).filter((item: any) => item.type === 'function_call' && item.status === 'completed');
      for (const call of calls) await handleToolCall(call);
      if (calls.length && turn === turnRef.current) sendRealtime({type: 'response.create'});
    } else if (event.type === 'error') {
      setStatus('unavailable');
    }
  }

  async function startVoice() {
    if (voiceActive) {
      stopVoice();
      return;
    }
    if (!window.RTCPeerConnection || !navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      return;
    }
    setOpen(true);
    setMinimized(false);
    setStatus('connecting');
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
        audio.play().catch(() => setStatus('playbackBlocked'));
      };
      stream.getAudioTracks().forEach((track) => peer.addTrack(track, stream));
      const channel = peer.createDataChannel('oai-events');
      channelRef.current = channel;
      channel.addEventListener('message', (event) => {
        try {
          void handleRealtimeEvent(JSON.parse(event.data));
        } catch {
          setStatus('eventFailed');
        }
      });
      channel.addEventListener('open', () => {
        setVoiceActive(true);
        setStatus('listening');
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
      setStatus('connectionFailed');
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
    <div role="complementary" className="leaf-assistant" aria-label={text.label} style={assistantStyle}>
      {!open ? (
        <button
          className="leaf-assistant__trigger"
          type="button"
          aria-expanded="false"
          aria-controls="leaf-assistant-panel"
          onClick={() => {
            setOpen(true);
            setMinimized(false);
          }}
        >
          <span aria-hidden="true">LEAF</span>
          <span className="sr-only">{text.open}</span>
        </button>
      ) : minimized ? (
        <div className={'leaf-assistant__minimized' + (voiceActive ? ' is-live' : '')}>
          <button
            className="leaf-assistant__drag-handle"
            type="button"
            aria-label={text.move}
            title={text.drag}
            onPointerDown={beginDrag}
            onPointerMove={drag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={moveWithKeyboard}
          >
            ⋮⋮
          </button>
          <button
            className="leaf-assistant__restore"
            type="button"
            onClick={() => setMinimized(false)}
            aria-label={text.restore}
          >
            <span>LEAF</span>
            <small>{voiceActive ? (statusText || text.activeVoice) : text.open}</small>
          </button>
          {voiceActive ? <span className="leaf-assistant__live-dot" aria-label={text.activeVoice} /> : null}
        </div>
      ) : (
        <section id="leaf-assistant-panel" className="leaf-assistant__panel" aria-live="polite">
          <header className="leaf-assistant__header">
            <button
              className="leaf-assistant__drag-handle"
              type="button"
              aria-label={text.move}
              title={text.drag}
              onPointerDown={beginDrag}
              onPointerMove={drag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={moveWithKeyboard}
            >
              ⋮⋮
            </button>
            <div className="leaf-assistant__header-copy">
              <p className="page-eyebrow">{text.eyebrow}</p>
              <h2>{text.title}</h2>
            </div>
            <div className="leaf-assistant__window-actions">
              <button
                type="button"
                onClick={() => setPosition({x: 0, y: 0})}
                aria-label={text.reset}
                title={text.resetTitle}
              >
                ↺
              </button>
              <button
                type="button"
                onClick={() => setMinimized(true)}
                aria-label={text.minimize}
                title={voiceActive ? text.minimizeLive : text.minimizeTitle}
              >
                −
              </button>
              <button
                type="button"
                onClick={() => {
                  if (voiceActive) {
                    setMinimized(true);
                  } else {
                    setOpen(false);
                    setMinimized(false);
                  }
                }}
                aria-label={voiceActive ? text.minimizeLive : text.close}
                title={voiceActive ? text.continuing : text.closeTitle}
              >
                ×
              </button>
            </div>
          </header>

          <div className="leaf-assistant__messages">
            <div className="leaf-assistant__message leaf-assistant__message--assistant">
              <strong>LEAF</strong>
              <p>{text.greeting}</p>
            </div>
            {messages.map((message, index) => (
              <div className={'leaf-assistant__message leaf-assistant__message--' + message.role} key={index}>
                <strong>{message.role === 'assistant' ? 'LEAF' : text.you}</strong>
                <p>{message.content}</p>
              </div>
            ))}
          </div>

          {links.length ? (
            <div className="leaf-assistant__links" aria-label={text.links}>
              {links.map((link) => (
                <button key={link.href} type="button" onClick={() => executeNavigation(link.href)}>
                  {link.label}
                </button>
              ))}
            </div>
          ) : null}

          <form className="leaf-assistant__composer" onSubmit={(event) => { void submit(event); }}>
            <label htmlFor="leaf-assistant-input" className="sr-only">{text.message}</label>
            <textarea
              id="leaf-assistant-input"
              rows={2}
              maxLength={1600}
              value={input}
              onChange={(event) => setInput(event.currentTarget.value)}
              placeholder={text.placeholder}
            />
            <div className="leaf-assistant__actions">
              <button type="button" className={voiceActive ? 'is-active' : ''} onClick={() => void startVoice()}>
                {voiceActive ? text.stopVoice : text.startVoice}
              </button>
              <button type="submit" disabled={busy || !input.trim()}>{text.send}</button>
            </div>
          </form>
          <p className="leaf-assistant__status" role="status">{statusText}</p>
          <p className="leaf-assistant__privacy">{text.privacy}</p>
        </section>
      )}
    </div>
  );
}
