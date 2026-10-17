'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerificaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const codice = searchParams.get('codice');
    if (!codice) {
      setStatus('error');
      setMessage('Link non valido.');
      return;
    }

    fetch(`https://luna2-api.onrender.com/verifica/${codice}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, data: d })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.detail || 'Errore di verifica');
        localStorage.setItem('luna2_token', data.access_token);
        setStatus('ok');
        setMessage(`Benvenuto ${data.nome}! Verifica completata.`);
        setTimeout(() => router.push('/sala'), 1500);
      })
      .catch((e) => {
        setStatus('error');
        setMessage(e.message);
      });
  }, [searchParams, router]);

  return (
    <div className="canvas">
      <div className="topbar">
        <Link href="/" className="back">← Home</Link>
        <div className="brand">✦ Luna Astrologica</div>
      </div>
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 400, textAlign: 'center', marginBottom: '16px' }}>
        {status === 'loading' && 'Verifica in corso...'}
        {status === 'ok' && 'Tutto pronto! 🌙'}
        {status === 'error' && 'Verifica fallita'}
      </h1>
      <p style={{ textAlign: 'center', fontSize: '15px', lineHeight: '1.6', color: 'var(--text-dim)' }}>
        {message}
      </p>
      {status === 'ok' && (
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--text-dim)' }}>
          Ti stiamo portando nella tua sala...
        </p>
      )}
      <div className="footer">
        <Link href="/privacy">Privacy</Link>·<Link href="/disclaimer">Disclaimer</Link>·<Link href="/faq">?</Link>
      </div>
    </div>
  );
}

export default function VerificaPage() {
  return (
    <Suspense fallback={<div className="canvas"><p style={{ textAlign: 'center', marginTop: '40px' }}>Caricamento...</p></div>}>
      <VerificaContent />
    </Suspense>
  );
}
