'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API_URL = "https://luna2-api.onrender.com";

function SogniContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [sogno, setSogno] = useState('');
  const [interpretazione, setInterpretazione] = useState<string | null>(null);
  const [inCaricamento, setInCaricamento] = useState(false);
  const [errore, setErrore] = useState('');
  const [bloccato, setBloccato] = useState(false);
  const [credito, setCredito] = useState(0);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    const tokenDaUrl = searchParams.get('token');
    if (tokenDaUrl) localStorage.setItem('luna2_token', tokenDaUrl);
    const t = tokenDaUrl || localStorage.getItem('luna2_token');
    if (!t) { router.push('/form'); return; }
    setToken(t);
    const n = localStorage.getItem('luna2_nome');
    if (n) setNome(n);
    
    // Prendiamo sia il credito che lo stato is_paying
    fetch(`${API_URL}/stato-credito/${t}`).then(r => r.json()).then(d => {
      setCredito(d.credito_secondi || 0);
      setIsPaying(d.is_paying || false);
    }).catch(() => {});
  }, [router, searchParams]);

  const interpreta = async () => {
    if (!token) return;
    if (!sogno.trim()) { setErrore('Scrivi il tuo sogno prima di chiedere l\'interpretazione.'); return; }
    setInCaricamento(true);
    setErrore('');
    setInterpretazione(null);

    try {
      const r = await fetch(`${API_URL}/sogni/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sogno: sogno.trim() }),
      });
      const d = await r.json();

      if (d.credito_secondi !== undefined) setCredito(d.credito_secondi);

      if (r.status === 402) {
        setBloccato(true);
        setErrore(d.detail || 'Hai già usato il sogno gratuito questa settimana.');
        return;
      }
      if (!r.ok) { setErrore(d.detail || 'Qualcosa non ha funzionato. Riprova.'); return; }
      setInterpretazione(d.interpretazione);
    } catch {
      setErrore('Impossibile contattare il servizio. Riprova tra poco.');
    } finally {
      setInCaricamento(false);
    }
  };

  const haCredito = credito >= 30;
  const mostraBarra = credito > 0 || isPaying;

  return (
    <div className="canvas">
      <div className="topbar">
        <Link href="/sala" className="back">← Indietro</Link>
        <div className="brand">✦ Luna Astrologica</div>
      </div>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 400, textAlign: 'center', marginBottom: '6px' }}>
        Interpreta un sogno
      </h1>
      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '22px' }}>
        {haCredito ? 'Stai usando il tuo credito a tempo.' : 'Racconta a Luna il tuo sogno. Un\'interpretazione gratuita a settimana.'}
      </p>

      {!interpretazione && !bloccato && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
          {nome && <p style={{ fontSize: '13px', color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: '12px' }}>Ciao {nome}, sono qui.</p>}
          <textarea value={sogno} onChange={(e) => setSogno(e.target.value)} placeholder="Ho sognato che..." rows={6} disabled={inCaricamento} style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', fontSize: '15px', color: 'var(--text)', fontFamily: 'inherit', resize: 'vertical', lineHeight: '1.6', boxSizing: 'border-box' }} />
          <button onClick={interpreta} disabled={inCaricamento || !sogno.trim()} className="cta" style={{ marginTop: '14px', width: '100%', fontSize: '15px', padding: '14px' }}>
            {inCaricamento ? 'Luna sta leggendo il tuo sogno...' : 'Interpreta il sogno'}
          </button>
        </div>
      )}

      {errore && (
        <div style={{ background: bloccato ? 'rgba(245,166,35,0.08)' : 'rgba(239,71,111,0.08)', border: `1px solid ${bloccato ? 'rgba(245,166,35,0.3)' : 'rgba(239,71,111,0.3)'}`, borderRadius: '10px', padding: '16px', marginBottom: '20px', fontSize: '14px', color: bloccato ? 'var(--text)' : '#EF476F', lineHeight: '1.6' }}>
          {errore}
          {bloccato && !haCredito && (
            <div style={{ marginTop: '14px' }}>
              <Link href="/consulenza" className="cta" style={{ display: 'inline-block', fontSize: '14px', padding: '10px 20px', textDecoration: 'none' }}>Prenota un consulto vocale →</Link>
            </div>
          )}
        </div>
      )}

      {interpretazione && (
        <div style={{ background: 'rgba(245,166,35,0.05)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>La lettura di Luna</div>
          <p style={{ fontSize: '15px', lineHeight: '1.8', whiteSpace: 'pre-wrap', margin: 0 }}>{interpretazione}</p>
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-dim)', marginBottom: '12px' }}>Vuoi approfondire?</div>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <Link href="/chat?focus=tema_previsioni" className="icon-btn" style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Chiedi alla Chat">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </Link>
              <Link href="/consulenza" className="icon-btn accent" style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Parla con la Voce">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
              </Link>
            </div>
          </div>
        </div>
      )}

      {mostraBarra && (
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
        <Link href="/faq">?</Link>
      </div>
    </div>
  );
}

export default function SogniPage() {
  return (
    <Suspense fallback={<div className="canvas"><div className="topbar"><div className="brand">✦ Luna Astrologica</div></div><p style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-dim)' }}>Caricamento...</p></div>}>
      <SogniContent />
    </Suspense>
  );
}
