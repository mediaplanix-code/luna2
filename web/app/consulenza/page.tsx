'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Vapi from '@vapi-ai/web';

const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_fZu14pfFefK76BRgk8e3e00";
const API_URL = "https://luna2-api.onrender.com";
const VAPI_PUBLIC_KEY = "5ca95508-9fa5-4cba-82dc-7860f7962780"; // La tua chiave
const VAPI_ASSISTANT_ID = "03b6ee79-4490-4c12-bd38-f00bfa2e6340"; // Il nuovo ID dell'assistente pulito (o quello che hai creato ora)

function ConsulenzaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focus = searchParams.get('focus') || 'generico';
  
  const [nome, setNome] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [credito, setCredito] = useState(0);
  const [inCaricamento, setInCaricamento] = useState(true);
  const [errore, setErrore] = useState('');
  const [chiamataAttiva, setChiamataAttiva] = useState(false);
  const [inAvvio, setInAvvio] = useState(false);

  const vapiRef = useRef<Vapi | null>(null);

  useEffect(() => {
    const n = localStorage.getItem('luna2_nome');
    if (n) setNome(n);
    const t = localStorage.getItem('luna2_token');
    if (!t) { router.push('/form'); return; }
    setToken(t);

    // Inizializza VAPI
    const vapi = new Vapi(VAPI_PUBLIC_KEY);
    vapiRef.current = vapi;

    vapi.on('call-start', () => {
      setChiamataAttiva(true);
      setInAvvio(false);
      // Avvia il timer sul server (se l'endpoint esiste)
      fetch(`${API_URL}/avvia-voce/${t}`, { method: 'POST' }).catch(() => {});
    });

    vapi.on('call-end', () => {
      setChiamataAttiva(false);
      setInAvvio(false);
      // Ferma il timer e scala i secondi
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
      // 1. Recupera i dati dal server per il contesto
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

      // 2. Passiamo i dati a VAPI come variabile 'contesto'
      const assistantOverrides = {
        variableValues: {
          contesto: testoContesto
        }
      };
      
      // 3. Avviamo la chiamata vocale vera e propria
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

  if (inCaricamento) {
    return <div className="canvas"><div className="topbar"><div className="brand">✦ Luna Astrologica</div></div><p style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-dim)' }}>Caricamento...</p></div>;
  }

  const haCredito = credito >= 30;

  return (
    <div className="canvas">
      <div className="topbar">
        <Link href={focus.startsWith('compatibilita') ? '/compatibilita' : '/sala'} className="back">← Indietro</Link>
        <div className="brand">✦ Luna Astrologica</div>
      </div>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 400, textAlign: 'center', marginBottom: '6px' }}>
        {focus === 'generico' ? 'Consulto Generale' : 'Approfondimento'}
      </h1>

      {haCredito ? (
        <div style={{ background: 'rgba(6,214,160,0.06)', border: '1px solid rgba(6,214,160,0.3)', borderRadius: '10px', padding: '24px 20px', marginBottom: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '16px' }}>
            {chiamataAttiva ? 'Luna è in linea. Parla pure.' : inAvvio ? 'Sto connettendo...' : 'Hai un credito attivo. Puoi parlare con Luna.'}
          </p>

          {!chiamataAttiva ? (
            <button onClick={avviaChiamata} disabled={inAvvio} className="cta" style={{ fontSize: '16px', padding: '16px', width: '100%', marginBottom: '16px', opacity: inAvvio ? 0.5 : 1 }}>
              {inAvvio ? 'Connessione in corso...' : 'Parla con Luna'}
            </button>
          ) : (
            <button onClick={fermaChiamata} className="cta" style={{ fontSize: '16px', padding: '16px', width: '100%', marginBottom: '16px', background: 'transparent', border: '1px solid #EF476F', color: '#EF476F' }}>
              Termina chiamata
            </button>
          )}

          {errore && <p style={{ fontSize: '13px', color: '#EF476F', marginBottom: '16px' }}>{errore}</p>}
          
          <button onClick={vaiAlPagamento} className="cta" style={{ width: '100%', fontSize: '14px', padding: '12px', background: 'transparent', border: '1px solid #F5A623', color: '#F5A623' }}>
            + Aggiungi altri 15 minuti (19€)
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '30px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
          <p style={{ marginBottom: '20px' }}>Sblocca 15 minuti per 19€.</p>
          <button onClick={vaiAlPagamento} className="cta" style={{ display: 'inline-block' }}>Paga ora</button>
        </div>
      )}

      <div className="footer" style={{ marginTop: '40px' }}>
        <Link href="/privacy">Privacy</Link>·
        <Link href="/disclaimer">Disclaimer</Link>·
        <Link href="/faq">?</Link>
      </div>
    </div>
  );
}

export default function ConsulenzaPage() {
  return (
    <Suspense fallback={<div className="canvas"><p style={{ textAlign: 'center', marginTop: '40px' }}>Caricamento...</p></div>}>
      <ConsulenzaContent />
    </Suspense>
  );
}
