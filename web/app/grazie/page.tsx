'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API_URL = "https://luna2-api.onrender.com";

function GrazieContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [stato, setStato] = useState<'loading' | 'ok' | 'errore'>('loading');
  const [messaggio, setMessaggio] = useState('');
  const [secondiRimasti, setSecondiRimasti] = useState(0);

  useEffect(() => {
    const t = searchParams.get('token') || localStorage.getItem('luna2_token');
    if (!t) {
      router.push('/form');
      return;
    }
    setToken(t);
    const n = localStorage.getItem('luna2_nome');
    if (n) setNome(n);
  }, [router, searchParams]);

  useEffect(() => {
    if (!token) return;

    fetch(`${API_URL}/conferma-pagamento/${token}`, { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        if (d.status === 'ok') {
          setStato('ok');
          setSecondiRimasti(d.minuti * 60);
        } else {
          setStato('errore');
          setMessaggio('Pagamento ricevuto ma non è stato possibile attivare l\'accesso. Ricarica la pagina o contatta l\'assistenza.');
        }
      })
      .catch(() => {
        setStato('errore');
        setMessaggio('Errore di connessione. Il pagamento è andato a buon fine ma l\'accesso non è stato attivato. Ricarica la pagina.');
      });
  }, [token]);

  // Timer locale: decrementa ogni secondo (solo per mostrare il countdown)
  useEffect(() => {
    if (stato !== 'ok' || secondiRimasti <= 0) return;
    const id = setInterval(() => {
      setSecondiRimasti(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [stato]);

  const minuti = Math.floor(secondiRimasti / 60);
  const secondi = secondiRimasti % 60;

  if (stato === 'loading') {
    return (
      <div className="canvas">
        <div className="topbar">
          <div className="brand">✦ Luna Astrologica</div>
        </div>
        <p style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-dim)' }}>
          Sto attivando il tuo accesso...
        </p>
      </div>
    );
  }

  if (stato === 'errore') {
    return (
      <div className="canvas">
        <div className="topbar">
          <div className="brand">✦ Luna Astrologica</div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '40px', padding: '0 20px' }}>
          <p style={{ fontSize: '15px', color: '#EF476F', marginBottom: '20px' }}>{messaggio}</p>
          <Link href="/consulenza" className="cta" style={{ display: 'inline-block', fontSize: '14px', padding: '12px 24px' }}>
            Riprova
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="canvas">
      <div className="topbar">
        <div className="brand">✦ Luna Astrologica</div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '40px', marginBottom: '30px' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>✅</div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 400, marginBottom: '10px' }}>
          Pagamento confermato
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--text-dim)', lineHeight: '1.6', maxWidth: '380px', margin: '0 auto' }}>
          {nome ? `Grazie ${nome}! ` : 'Grazie! '}
          Il tuo accesso di 15 minuti è attivo. Puoi usare chat, voce e approfondimenti.
        </p>
      </div>

      <div style={{
        background: 'rgba(6,214,160,0.06)',
        border: '1px solid rgba(6,214,160,0.3)',
        borderRadius: '10px',
        padding: '20px',
        marginBottom: '30px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '6px' }}>
          Tempo rimasto
        </div>
        <div style={{ fontSize: '32px', fontWeight: 600, color: '#06D6A0', fontFamily: 'monospace' }}>
          {String(minuti).padStart(2, '0')}:{String(secondi).padStart(2, '0')}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Link
          href="/chat"
          className="cta"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', padding: '16px', textDecoration: 'none' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Vai alla chat
        </Link>

        <Link
          href="/sala"
          className="cta"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', padding: '16px', background: 'transparent', border: '1px solid var(--text-dim)', color: 'var(--text-dim)', textDecoration: 'none' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Torna alla sala
        </Link>

        <Link
          href="/consulenza"
          className="cta"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', padding: '16px', background: 'transparent', border: '1px solid #F5A623', color: '#F5A623', textDecoration: 'none' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
          Parla con Luna
        </Link>
      </div>

      <div className="footer" style={{ marginTop: '40px' }}>
        <Link href="/privacy">Privacy</Link>·
        <Link href="/disclaimer">Disclaimer</Link>·
        <Link href="/faq">?</Link>
      </div>
    </div>
  );
}

export default function GraziePage() {
  return (
    <Suspense fallback={
      <div className="canvas">
        <div className="topbar">
          <div className="brand">✦ Luna Astrologica</div>
        </div>
        <p style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-dim)' }}>
          Caricamento...
        </p>
      </div>
    }>
      <GrazieContent />
    </Suspense>
  );
}
