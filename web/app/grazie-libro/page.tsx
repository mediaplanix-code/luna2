'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API_URL = "https://luna2-api.onrender.com";

function GrazieLibroContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [stato, setStato] = useState<'loading' | 'ok' | 'errore'>('loading');

  useEffect(() => {
    const n = localStorage.getItem('luna2_nome');
    if (n) setNome(n);
    const t = localStorage.getItem('luna2_token');
    if (!t) { router.push('/form'); return; }
    setToken(t);
  }, [router]);

  useEffect(() => {
    if (!token) return;

    // Chiama il backend per mettere in coda il libro
    fetch(`${API_URL}/acquista-libro/${token}`, { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        if (d.status === 'ok') setStato('ok');
        else setStato('errore');
      })
      .catch(() => setStato('errore'));
  }, [token]);

  if (stato === 'loading') {
    return <div className="canvas"><div className="topbar"><div className="brand">✦ Luna Astrologica</div></div><p style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-dim)' }}>Sto preparando il tuo libro...</p></div>;
  }

  if (stato === 'errore') {
    return (
      <div className="canvas">
        <div className="topbar"><div className="brand">✦ Luna Astrologica</div></div>
        <div style={{ textAlign: 'center', marginTop: '40px', padding: '0 20px' }}>
          <p style={{ fontSize: '15px', color: '#EF476F', marginBottom: '20px' }}>Pagamento ricevuto, ma c'è stato un problema con la coda del libro. Contatta l'assistenza.</p>
          <Link href="/sala" className="cta" style={{ display: 'inline-block', fontSize: '14px', padding: '12px 24px' }}>Torna alla Sala</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="canvas">
      <div className="topbar"><div className="brand">✦ Luna Astrologica</div></div>

      <div style={{ textAlign: 'center', marginTop: '40px', marginBottom: '30px' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>📖</div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 400, marginBottom: '10px' }}>
          Le stelle stanno stampando il tuo libro
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--text-dim)', lineHeight: '1.6', maxWidth: '380px', margin: '0 auto' }}>
          {nome ? `Grazie ${nome}! ` : 'Grazie! '}
          Il tuo libro "Il Tuo Cielo 2027" è in preparazione. Lo riceverai via email entro 3 ore.
        </p>
      </div>

      <div style={{ background: 'rgba(6,214,160,0.06)', border: '1px solid rgba(6,214,160,0.3)', borderRadius: '10px', padding: '20px', textAlign: 'center', marginBottom: '30px' }}>
        <p style={{ fontSize: '14px', color: 'var(--text)' }}>
          Controlla la tua casella di posta (anche lo Spam) tra qualche ora.
        </p>
      </div>

      <Link href="/sala" className="cta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', padding: '16px', textDecoration: 'none' }}>
        Torna alla tua Sala
      </Link>
    </div>
  );
}

export default function GrazieLibroPage() {
  return (
    <Suspense fallback={<div className="canvas"><p style={{ textAlign: 'center', marginTop: '40px' }}>Caricamento...</p></div>}>
      <GrazieLibroContent />
    </Suspense>
  );
}
