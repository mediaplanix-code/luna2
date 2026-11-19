'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { GoogleGenAI, Modality } from '@google/genai';

const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_fZu14pfFefK76BRgk8e3e00";
const API_URL = "https://luna2-api.onrender.com";

// Funzione per convertire l'audio in PCM16 (richiesto da Gemini)
function float32ToInt16(buffer: Float32Array) {
  let l = buffer.length;
  let buf = new Int16Array(l);
  while (l--) {
    buf[l] = Math.min(1, Math.max(-1, buffer[l])) * 0x7FFF;
  }
  return buf.buffer;
}

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

  const timerStartedRef = useRef(false);
  const sessionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

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
  }, [router]);

  useEffect(() => () => {
    fermaChiamata();
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
    if (!token || inAvvio || chiamataAttiva) return;
    setErrore('');
    setInAvvio(true);

    try {
      // 1. Chiedi al backend il prompt e la chiave API di Gemini
      const sessionRes = await fetch(`${API_URL}/voce/sessione/${token}?focus=${encodeURIComponent(focus)}`, {
        method: 'POST'
      });
      const sessionData = await sessionRes.json();
      
      if (!sessionRes.ok || !sessionData.prompt) {
        throw new Error(sessionData.detail || 'Impossibile preparare la sessione vocale.');
      }

      // 2. Setup Audio Context e Microfono
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // 3. Inizializza Gemini
      const ai = new GoogleGenAI({ apiKey: sessionData.api_key });
      
      // Usiamo il modello standard per l'API Live
      const session = await ai.live.connect({
        model: "gemini-2.0-flash-exp", 
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: { parts: [{ text: sessionData.prompt }] },
        },
        callbacks: {
          onopen: async () => {
            // Avvia il timer del credito sul backend
            const timerRes = await fetch(`${API_URL}/avvia-voce/${token}`, { method: 'POST' });
            if (timerRes.ok) {
              timerStartedRef.current = true;
              setChiamataAttiva(true);
              setInAvvio(false);
            } else {
              throw new Error('Non riesco ad avviare il conteggio del credito.');
            }
          },
          onmessage: (message: any) => {
            // Ricezione audio da Gemini
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && audioCtxRef.current) {
              const binaryString = atob(audioData);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              // Conversione e riproduzione (PCM16 -> Float32)
              const dataView = new DataView(bytes.buffer);
              const audioBuffer = audioCtxRef.current.createBuffer(1, bytes.length / 2, 24000);
              const channelData = audioBuffer.getChannelData(0);
              for (let i = 0; i < audioBuffer.length; i++) {
                channelData[i] = dataView.getInt16(i * 2, true) / 32768.0;
              }
              const sourceNode = audioCtxRef.current.createBufferSource();
              sourceNode.buffer = audioBuffer;
              sourceNode.connect(audioCtxRef.current.destination);
              sourceNode.start();
            }
          },
          onclose: () => {
            fermaChiamata();
          },
          onerror: (err: any) => {
            console.error('Gemini errore:', err);
            setErrore('Connessione audio interrotta o chiave API non valida.');
            fermaChiamata();
          }
        }
      });

      sessionRef.current = session;

      // Invia l'audio del microfono a Gemini
      processor.onaudioprocess = (e) => {
        if (!sessionRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = float32ToInt16(inputData);
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcm16)));
        
        try {
          sessionRef.current.sendRealtimeInput({
            audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          });
        } catch (err) {
          // Ignora errori di invio se la sessione è chiusa
        }
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

    } catch (e: any) {
      console.error('Errore voce Realtime:', e);
      setErrore(e?.message || 'Impossibile avviare la voce. Controlla il microfono.');
      fermaChiamata();
    }
  };

  const fermaChiamata = () => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    
    setChiamataAttiva(false);
    setInAvvio(false);

    if (token && timerStartedRef.current) {
      timerStartedRef.current = false;
      fetch(`${API_URL}/ferma-voce/${token}`, { method: 'POST' })
        .then(r => r.json())
        .then(d => { if (d.credito_secondi !== undefined) setCredito(d.credito_secondi); })
        .catch(() => {});
    }
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

      {haCredito ? (
        <div style={{ background: 'rgba(6,214,160,0.06)', border: '1px solid rgba(6,214,160,0.3)', borderRadius: '10px', padding: '24px 20px', marginBottom: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '16px' }}>
            {chiamataAttiva ? 'Luna è in linea. Parla pure.' : inAvvio ? 'Sto connettendo le stelle...' : 'Hai un credito attivo. Puoi parlare con Luna.'}
          </p>

          {!chiamataAttiva ? (
            <button onClick={avviaChiamata} disabled={inAvvio} className="cta" style={{ fontSize: '16px', padding: '16px', width: '100%', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: inAvvio ? 0.5 : 1 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
              {inAvvio ? 'Connessione in corso...' : 'Parla con Luna'}
            </button>
          ) : (
            <button onClick={fermaChiamata} className="cta" style={{ fontSize: '16px', padding: '16px', width: '100%', marginBottom: '16px', background: 'transparent', border: '1px solid #EF476F', color: '#EF476F', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
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
