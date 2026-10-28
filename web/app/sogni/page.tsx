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

  useEffect(() => {
    const tokenDaUrl = searchParams.get('token');
    if (tokenDaUrl) localStorage.setItem('luna2_token', tokenDaUrl);
    const t = tokenDaUrl || localStorage.getItem('luna2_token');
    if (!t) { router.push('/form'); return; }
    setToken(t);
    const n = localStorage.getItem('luna2_nome');
    if (n) setNome(n);
    
    fetch(`${API_URL}/stato-credito/${t}`).then(r => r.json()).then(d => setCredito(d.credito_secondi || 0)).catch(() => {});
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
         
