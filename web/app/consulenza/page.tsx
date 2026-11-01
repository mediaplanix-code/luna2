'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_fZu14pfFefK76BRgk8e3e00";
const API_URL = "https://luna2-api.onrender.com";
const VAPI_PUBLIC_KEY = "5ca95508-9fa5-4cba-82dc-7860f7962780";
const VAPI_ASSISTANT_ID = "7a6e8b6e-1683-4247-bfb8-024cc92d02e7";

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

  useEffect(() => {
    const n = localStorage.getItem('luna2_nome');
    if (n) setNome(n);
    const t = localStorage.getItem('luna2_token');
    if (!t) { router.push('/form'); return; }
    setToken(t);
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
    if (!token) return;
    setErrore('');
    setChiamataAttiva(true);

    try {
      // 1. Recupera i dati per il contesto
      const resDati = await fetch(`${API_URL}/tool/dati-cliente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token })
      });
      const dati = await resDati.json();
      const testoContesto = dati.nome 
        ? `Il cliente si chiama ${dati.nome}. Sole in ${dati.sole?.segno}, Luna in ${dati.luna?.segno}, Ascendente in ${dati.ascendente?.segno}.`
        : 'Dati non disponibili.';

      // 2. Chiamata diretta a VAPI
      const vapiRes = await fetch('https://api.vapi.ai/call/web', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VAPI_PUBLIC_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assistantId: VAPI_ASSISTANT_ID,
          assistantOverrides: {
            variableValues: {
              contesto: testoContesto
            }
          }
        })
      });

      if (!vapiRes.ok) {
        const errData = await vapiRes.json();
        // Stampiamo l'errore esatto in console
        console.error("ERRORE VAPI DETTAGLIATO:", errData);
        setErrore(`Errore VAPI: ${errData.message || errData.error || 'Errore sconosciuto'}`);
        setChiamataAttiva(false);
        return;
      }

      // Se arriva qui, la chiamata è partita
      // Nota: per far sentire l'audio, dobbiamo usare la libreria VAPI.
      // Ma per il debug, questo ci dice se il server risponde 200.
      setErrore('Chiamata creata con successo, ma per l\'audio serve la libreria.');

    } catch (e: any) {
      console.error(e);
      setErrore('Errore di rete. Controlla la connessione.');
      setChiamataAttiva(false);
    }
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
            {chiamataAttiva ? 'Connessione in corso...' : 'Hai un credito attivo. Puoi parlare con Luna.'}
          </p>

          <button onClick={avviaChiamata} className="cta" style={{ fontSize: '16px', padding: '16px', width: '100%', marginBottom: '16px' }}>
            Parla con Luna
          </button>

          {errore && <p style={{ fontSize: '13px', color: '#EF476F', marginBottom: '16px', textAlign: 'left', whiteSpace: 'pre-wrap' }}>{errore}</p>}
          
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
