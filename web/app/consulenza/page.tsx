'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Vapi from '@vapi-ai/web';

const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_fZu14pfFefK76BRgk8e3e00";
const API_URL = "https://luna2-api.onrender.com";
const VAPI_PUBLIC_KEY = "5ca95508-9fa5-4cba-82dc-7860f7962780"; 
const VAPI_ASSISTANT_ID = "7a6e8b6e-1683-4247-bfb8-024cc92d02e7";

function ConsulenzaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focus = searchParams.get('focus') || 'generico';
  const pagato = searchParams.get('pagato');

  const [nome, setNome] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [credito, setCredito] = useState(0);
  const [inCaricamento, setInCaricamento] = useState(true);
  const [errore, setErrore] = useState('');
  const [confermato, setConfermato] = useState(false);
  const [chiamataAttiva, setChiamataAttiva] = useState(false);
  const [inAvvio, setInAvvio] = useState(false);
  const [motoreVoce, setMotoreVoce] = useState<'vapi' | 'gemini'>('vapi');

  const socketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const muteRef = useRef<GainNode | null>(null);
  const timerStartedRef = useRef(false);
  const setupReadyRef = useRef(false);
  const manualStopRef = useRef(false);
  const playbackTimeRef = useRef(0);
  const playbackSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const vapiRef = useRef<Vapi | null>(null);

  const etichetteFocus: Record<string, string> = {
    generico: 'Consulto Generale', tema_amore: 'Approfondimento Amore', tema_lavoro: 'Approfondimento Lavoro', tema_salute: 'Approfondimento Salute', tema_crescita: 'Approfondimento Crescita Personale', tema_previsioni: 'Approfondimento Previsioni', tema_pianeti: 'Approfondimento Pianeti', tema_case: 'Approfondimento Case', tema_aspetti: 'Approfondimento Aspetti', tema_transiti: 'Approfondimento Transiti', compatibilita_amore: 'Compatibilità Amorosa', compatibilita_lavoro: 'Compatibilità Lavorativa', compatibilita_salute: 'Compatibilità Salute', compatibilita_crescita: 'Compatibilità Crescita', compatibilita_previsioni: 'Compatibilità Previsioni', compatibilita: 'Compatibilità Generale',
  };
  const etichetta = etichetteFocus[focus] || 'Consulto';

  useEffect(() => {
    const n = localStorage.getItem('luna2_nome');
    if (n) setNome(n);
    const t = localStorage.getItem('luna2_token');
    if (!t) { router.push('/form'); return; }
    setToken(t);

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const audioCtx = new AudioContext();
        if (audioCtx.state === 'suspended') audioCtx.resume();
      }
    } catch (e) {}

    const vapi = new Vapi(VAPI_PUBLIC_KEY);
    vapiRef.current = vapi;

    vapi.on('call-start', () => {
      setChiamataAttiva(true);
      setInAvvio(false);
      fetch(`${API_URL}/avvia-voce/${t}`, { method: 'POST' }).catch(() => {});
    });

    vapi.on('call-end', () => {
      setChiamataAttiva(false);
      setInAvvio(false);
      fetch(`${API_URL}/ferma-voce/${t}`, { method: 'POST' })
        .then(r => r.json())
        .then(d => { if (d.credito_secondi !== undefined) setCredito(d.credito_secondi); })
        .catch(() => {});
    });

    vapi.on('error', (e) => {
      console.error('Errore Vapi:', e);
      setErrore('Errore di connessione con la voce. Riprova.');
      setChiamataAttiva(false);
      setInAvvio(false);
    });

    return () => {
      vapi.stop();
    };
  }, [router]);

  useEffect(() => () => {
    manualStopRef.current = true;
    setupReadyRef.current = false;
    socketRef.current?.close();
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    muteRef.current?.disconnect();
    streamRef.current?.getTracks().forEach(track => track.stop());
    playbackSourcesRef.current.forEach(source => { try { source.stop(); } catch {} });
    const context = audioContextRef.current;
    if (context && context.state !== 'closed') context.close().catch(() => {});
    if (token && timerStartedRef.current) {
      timerStartedRef.current = false;
      fetch(`${API_URL}/ferma-voce/${token}`, { method: 'POST', keepalive: true }).catch(() => {});
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (pagato === '1' && !confermato) {
      setConfermato(true);
      fetch(`${API_URL}/conferma-pagamento/${token}`, { method: 'POST' })
        .then(r => r.json())
        .then(d => { if (d.status === 'ok') setCredito(d.credito_secondi); else setErrore('Pagamento ricevuto ma errore di attivazione.'); })
        .catch(() => setErrore('Pagamento ricevuto ma errore di connessione.'));
    }
  }, [token, pagato, confermato]);

  useEffect(() => {
    if (!token) return;
    const controlla = () => {
      fetch(`${API_URL}/stato-credito/${token}`)
        .then(r => r.json())
        .then(d => { setCredito(d.credito_secondi || 0); setInCaricamento(false); })
        .catch(() => setInCaricamento(false));
    };
    controlla();
    const id = setInterval(controlla, 15000);
    return () => clearInterval(id);
  }, [token]);

  const vaiAlPagamento = () => { window.location.href = STRIPE_PAYMENT_LINK; };

  const avviaChiamata = async () => {
    if (!vapiRef.current || !token) return;
    setErrore('');
    setInAvvio(true);

    try {
      const res = await fetch(`${API_URL}/tool/dati-cliente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token })
      });
      
      const dati = await res.json();
      let testoContesto = "I dati del cliente non sono disponibili.";
      if (dati && dati.nome) {
        testoContesto = `Il cliente si chiama ${dati.nome}. Il suo Sole è in ${dati.sole?.segno}, la Luna in ${dati.luna?.segno}, l'Ascendente in ${dati.ascendente?.segno}.`;
      }

      const assistantOverrides = {
        variableValues: {
          contesto: testoContesto
        }
      };
      
      await vapiRef.current.start(VAPI_ASSISTANT_ID, assistantOverrides);
    } catch (e: any) {
      console.error(e);
      setErrore('Impossibile avviare la chiamata. Controlla il microfono.');
      setInAvvio(false);
    }
  };

  const fermaChiamata = () => {
    if (vapiRef.current) vapiRef.current.stop();
  };

  const fermaTimerCredito = () => {
    if (!token || !timerStartedRef.current) return;
    timerStartedRef.current = false;
    fetch(`${API_URL}/ferma-voce/${token}`, { method: 'POST' })
      .then(r => r.json())
      .then(d => { if (d.credito_secondi !== undefined) setCredito(d.credito_secondi); })
      .catch(() => {});
  };

  const pulisciAudioGemini = () => {
    setupReadyRef.current = false;
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    muteRef.current?.disconnect();
    processorRef.current = null;
    sourceRef.current = null;
    muteRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    playbackSourcesRef.current.forEach(source => { try { source.stop(); } catch {} });
    playbackSourcesRef.current.clear();
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== 'closed') context.close().catch(() => {});
  };

  const avviaChiamataGemini = async () => {
    if (!token || inAvvio || chiamataAttiva) return;
    setErrore('');
    setInAvvio(true);
    manualStopRef.current = false;
    setupReadyRef.current = false;
    playbackTimeRef.current = 0;

    try {
      const sessionRes = await fetch(`${API_URL}/voce/sessione-gemini/${token}?focus=${encodeURIComponent(focus)}`, {
        method: 'POST'
      });
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok || !sessionData.ephemeral_token || !sessionData.instructions) {
        throw new Error(sessionData.detail || 'Impossibile preparare la sessione Gemini Live.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = stream;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      await audioContext.resume();

      const socketUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(sessionData.ephemeral_token)}`;
      const socket = new WebSocket(socketUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        socket.send(JSON.stringify({
          setup: {
            model: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                languageCode: 'it-IT',
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Leda' } }
              }
            },
            systemInstruction: { parts: [{ text: sessionData.instructions }] },
            realtimeInputConfig: {
              automaticActivityDetection: { disabled: false, silenceDurationMs: 700 }
            }
          }
        }));
      };

      socket.onmessage = async (event) => {
        let message: any;
        try { message = JSON.parse(event.data); } catch { return; }

        if (message.setupComplete && !setupReadyRef.current) {
          setupReadyRef.current = true;
          try {
            if (socket.readyState !== WebSocket.OPEN || manualStopRef.current) return;
            const timerRes = await fetch(`${API_URL}/avvia-voce/${token}`, { method: 'POST' });
            const timerData = await timerRes.json();
            if (!timerRes.ok || timerData.status !== 'ok') {
              throw new Error(timerData.detail || 'Impossibile avviare il conteggio del credito.');
            }
            timerStartedRef.current = true;
            setupReadyRef.current = true;
            setChiamataAttiva(true);
            setInAvvio(false);
            socket.send(JSON.stringify({
              clientContent: {
                turns: [{ role: 'user', parts: [{ text: 'Inizia il consulto salutando la persona e presentandoti con naturalezza. Poi ascolta la sua prima domanda.' }] }],
                turnComplete: true
              }
            }));
          } catch (err: any) {
            setErrore(err?.message || 'Errore durante l’avvio del credito.');
            setInAvvio(false);
            socket.close();
            pulisciAudioGemini();
            fermaTimerCredito();
          }
        }

        const serverContent = message.serverContent;
        if (audioContext.state === 'closed') return;
        if (serverContent?.interrupted) {
          playbackSourcesRef.current.forEach(source => { try { source.stop(); } catch {} });
          playbackSourcesRef.current.clear();
          playbackTimeRef.current = audioContext.currentTime;
        }
        const parts = serverContent?.modelTurn?.parts || [];
        for (const part of parts) {
          const encoded = part.inlineData?.data;
          if (!encoded || !String(part.inlineData?.mimeType || '').startsWith('audio/pcm')) continue;
          const binary = atob(encoded);
          const samples = new Int16Array(binary.length / 2);
          for (let i = 0; i < samples.length; i++) {
            const lo = binary.charCodeAt(i * 2);
            const hi = binary.charCodeAt(i * 2 + 1);
            samples[i] = (hi << 8) | lo;
          }
          const buffer = audioContext.createBuffer(1, samples.length, 24000);
          const channelData = buffer.getChannelData(0);
          for (let i = 0; i < samples.length; i++) channelData[i] = samples[i] / 32768;
          const player = audioContext.createBufferSource();
          player.buffer = buffer;
          player.connect(audioContext.destination);
          const when = Math.max(audioContext.currentTime + 0.02, playbackTimeRef.current);
          player.start(when);
          playbackTimeRef.current = when + buffer.duration;
          playbackSourcesRef.current.add(player);
          player.onended = () => playbackSourcesRef.current.delete(player);
        }
      };

      socket.onerror = (event) => {
        console.error('[Gemini Live] Errore WebSocket:', event);
        if (!manualStopRef.current) setErrore('Connessione Gemini Live non riuscita. Verifica la configurazione della sessione e riprova.');
        setChiamataAttiva(false);
        setInAvvio(false);
        pulisciAudioGemini();
        fermaTimerCredito();
      };
      socket.onclose = (event) => {
        console.error('[Gemini Live] WebSocket chiuso:', { code: event.code, reason: event.reason, wasClean: event.wasClean });
        if (!manualStopRef.current && event.code !== 1000) {
          const dettaglio = event.reason ? ` — ${event.reason}` : '';
          setErrore(`Connessione vocale chiusa (codice ${event.code}${dettaglio}). Riprova.`);
        }
        setChiamataAttiva(false);
        setInAvvio(false);
        pulisciAudioGemini();
        fermaTimerCredito();
      };

      // Acquisizione microfono: ricampionamento browser -> PCM mono 16 kHz little-endian.
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      const processor = audioContext.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;
      const mute = audioContext.createGain();
      mute.gain.value = 0;
      muteRef.current = mute;
      processor.onaudioprocess = (audioEvent) => {
        if (!setupReadyRef.current || socket.readyState !== WebSocket.OPEN) return;
        const input = audioEvent.inputBuffer.getChannelData(0);
        const ratio = audioContext.sampleRate / 16000;
        const outputLength = Math.floor(input.length / ratio);
        const pcm = new Int16Array(outputLength);
        for (let i = 0; i < outputLength; i++) {
          const position = i * ratio;
          const left = Math.floor(position);
          const fraction = position - left;
          const a = input[left] || 0;
          const b = input[Math.min(left + 1, input.length - 1)] || 0;
          const sample = Math.max(-1, Math.min(1, a + (b - a) * fraction));
          pcm[i] = sample < 0 ? sample * 32768 : sample * 32767;
        }
        const bytes = new Uint8Array(pcm.buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        socket.send(JSON.stringify({
          realtimeInput: { audio: { mimeType: 'audio/pcm;rate=16000', data: btoa(binary) } }
        }));
      };
      source.connect(processor);
      processor.connect(mute);
      mute.connect(audioContext.destination);
    } catch (e: any) {
      console.error('Errore voce Gemini Live:', e);
      setErrore(e?.message || 'Impossibile avviare la voce. Controlla il microfono.');
      setInAvvio(false);
      socketRef.current?.close();
      socketRef.current = null;
      pulisciAudioGemini();
      fermaTimerCredito();
    }
  };

  const fermaChiamataGemini = () => {
    manualStopRef.current = true;
    socketRef.current?.close(1000, 'User ended call');
    socketRef.current = null;
    pulisciAudioGemini();
    setChiamataAttiva(false);
    setInAvvio(false);
    fermaTimerCredito();
  };


  if (inCaricamento) {
    return <div className="canvas"><div className="topbar"><div className="brand">✦ tuFelia</div></div><p style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-dim)' }}>Caricamento...</p></div>;
  }

  const haCredito = credito >= 30;

  return (
    <div className="canvas">
      <div className="topbar">
        <Link href={focus.startsWith('compatibilita') ? '/compatibilita' : '/sala'} className="back">← Indietro</Link>
        <div className="brand">✦ tuFelia</div>
      </div>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 400, textAlign: 'center', marginBottom: '6px' }}>{etichetta}</h1>
      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '22px' }}>15 minuti di accesso a tutto: chat, voce e approfondimenti.</p>

      {haCredito && (
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '14px' }}>
          <button type="button" onClick={() => setMotoreVoce('vapi')} disabled={chiamataAttiva || inAvvio} className="cta" style={{ flex: 1, padding: '10px', opacity: motoreVoce === 'vapi' ? 1 : 0.55, border: motoreVoce === 'vapi' ? '1px solid #06D6A0' : '1px solid var(--text-dim)' }}>Voce originale</button>
          <button type="button" onClick={() => setMotoreVoce('gemini')} disabled={chiamataAttiva || inAvvio} className="cta" style={{ flex: 1, padding: '10px', opacity: motoreVoce === 'gemini' ? 1 : 0.55, border: motoreVoce === 'gemini' ? '1px solid #06D6A0' : '1px solid var(--text-dim)' }}>Gemini Live</button>
        </div>
      )}

      {haCredito ? (
        <div style={{ background: 'rgba(6,214,160,0.06)', border: '1px solid rgba(6,214,160,0.3)', borderRadius: '10px', padding: '24px 20px', marginBottom: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '16px' }}>
            {chiamataAttiva ? 'Luna è in linea. Parla pure.' : inAvvio ? 'Sto connettendo le stelle...' : 'Hai un credito attivo. Puoi parlare con Luna.'}
          </p>

          {!chiamataAttiva ? (
            <button onClick={motoreVoce === 'gemini' ? avviaChiamataGemini : avviaChiamata} disabled={inAvvio} className="cta" style={{ fontSize: '16px', padding: '16px', width: '100%', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: inAvvio ? 0.5 : 1 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
              {inAvvio ? 'Connessione in corso...' : 'Parla con Luna'}
            </button>
          ) : (
            <button onClick={motoreVoce === 'gemini' ? fermaChiamataGemini : fermaChiamata} className="cta" style={{ fontSize: '16px', padding: '16px', width: '100%', marginBottom: '16px', background: 'transparent', border: '1px solid #EF476F', color: '#EF476F', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              Termina chiamata
            </button>
          )}

          {errore && <p style={{ fontSize: '13px', color: '#EF476F', marginBottom: '16px' }}>{errore}</p>}

          <button onClick={vaiAlPagamento} className="cta" style={{ width: '100%', fontSize: '14px', padding: '12px', background: 'transparent', border: '1px solid #F5A623', color: '#F5A623' }}>+ Aggiungi altri 15 minuti (19€)</button>
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '10px', padding: '30px 20px', marginBottom: '20px', textAlign: 'center' }}>
          {errore && <p style={{ fontSize: '13px', color: '#EF476F', marginBottom: '16px' }}>{errore}</p>}
          <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginBottom: '20px' }}>{nome ? `Ciao ${nome}, ` : ''}sblocca 15 minuti di accesso completo per 19€.</p>
          <button onClick={vaiAlPagamento} className="cta" style={{ fontSize: '16px', padding: '16px 32px', margin: '0 auto', display: 'inline-block' }}>Paga 19€ e inizia</button>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '16px' }}>Pagamento sicuro con Stripe. Nessun abbonamento.</p>
        </div>
      )}

      <div style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--text)', marginBottom: '20px', marginTop: '24px' }}>
        <p style={{ marginBottom: '12px' }}><strong>Cosa include:</strong></p>
        <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
          <li>15 minuti di accesso a chat, voce e approfondimenti</li>
          <li>Analisi del tuo tema natale e dei transiti attuali</li>
          <li>Risposte alle tue domande specifiche</li>
        </ul>
      </div>

      {haCredito && (
        <div style={{ marginTop: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-dim)', marginBottom: '6px' }}>
            <span>Credito residuo</span>
            <span style={{ color: credito <= 120 ? '#EF476F' : credito <= 300 ? '#F5A623' : '#06D6A0', fontWeight: 600 }}>
              {Math.floor(credito / 60)}:{(credito % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (credito / 990) * 100)}%`, height: '100%', background: credito <= 120 ? '#EF476F' : credito <= 300 ? '#F5A623' : '#06D6A0', transition: 'width 1s linear' }} />
          </div>
        </div>
      )}

      <div className="footer" style={{ marginTop: '40px' }}>
        <Link href="/privacy">Privacy</Link>·
        <Link href="/disclaimer">Disclaimer</Link>·
        <Link href="/faq">FAQ</Link>
      </div>
    </div>
  );
}

export default function ConsulenzaPage() {
  return (
    <Suspense fallback={<div className="canvas"><div className="topbar"><div className="brand">✦ tuFelia</div></div><p style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-dim)' }}>Caricamento...</p></div>}>
      <ConsulenzaContent />
    </Suspense>
  );
}
