'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = "https://luna2-api.onrender.com";

export default function AccediPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [errore, setErrore] = useState('');
  const [inCaricamento, setInCaricamento] = useState(false);

  const recupera = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrore('');
    setInCaricamento(true);

    try {
      const r = await fetch(`${API_URL}/recupera-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email }),
      });

      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Nessun profilo trovato');

      localStorage.setItem('luna2_token', d.access_token);
      localStorage.setItem('luna2_nome', d.nome || '');
      
      router.push('/sala');
    } catch (err: any) {
      setErrore(err.message || 'Errore di connessione');
    } finally {
      setInCaricamento(false);
    }
  };

  return (
    <div className="canvas">
      <div className="topbar">
        <Link href="/" className="back">← Home</Link>
        <div className="brand">✦ tuFelia</div>
      </div>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 400, textAlign: 'center', marginBottom: '6px' }}>
        Bentornato
      </h1>
      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '22px' }}>
        Inserisci la tua email per rientrare nella tua sala.
      </p>

      <form onSubmit={recupera}>
        <div className="field">
          <label>Email</label>
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
            placeholder="La tua email" 
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(245,166,35,0.25)', background: 'rgba(255,255,255,0.03)', color: 'var(--text)', fontSize: '14px' }}
          />
        </div>

        {errore && <div className="error" style={{ marginTop: '16px' }}>{errore}</div>}

        <button type="submit" disabled={inCaricamento} className="cta" style={{ marginTop: '24px', width: '100%' }}>
          {inCaricamento ? 'Ricerca in corso...' : 'Rientra nella tua sala'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-dim)', marginTop: '20px' }}>
        Non hai un account? <Link href="/form" style={{ color: '#F5A623' }}>Iscriviti qui</Link>
      </p>

      <div className="footer">
        <Link href="/privacy">Privacy</Link>·
        <Link href="/disclaimer">Disclaimer</Link>·
        <Link href="/faq">FAQ</Link>
      </div>
    </div>
  );
}
