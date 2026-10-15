'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AccediPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('https://luna2-api.onrender.com/recupera-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Errore ${res.status}`);
      if (!data.access_token) throw new Error('Token non ricevuto.');

      localStorage.setItem('luna2_token', data.access_token);
      if (data.nome) localStorage.setItem('luna2_nome', data.nome);
      router.push('/sala');
    } catch (err: any) {
      setError(err.message || 'Errore sconosciuto');
      setLoading(false);
    }
  }

  return (
    <div className="canvas">
      <div className="topbar">
        <Link href="/" className="back">← Home</Link>
        <div className="brand">✦ Luna Astrologica</div>
      </div>

      <h1 style={{
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        fontWeight: 400,
        textAlign: 'center',
        marginBottom: '6px'
      }}>
        Bentornato
      </h1>
      <p style={{
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--text-dim)',
        marginBottom: '22px'
      }}>
        Inserisci la tua email per rientrare.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="la tua email"
            autoComplete="email"
            required
          />
        </div>

        <button type="submit" className="cta" disabled={loading}
          style={{ marginTop: '22px' }}>
          {loading ? 'Cerco il tuo profilo...' : 'Entra'}
        </button>

        {error && (
          <div className="error" style={{ marginTop: '14px' }}>
            {error}
          </div>
        )}
      </form>

      <p style={{
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--text-dim)',
        marginTop: '22px'
      }}>
        Non sei ancora iscritto?{' '}
        <Link href="/form" style={{ color: '#F5A623', textDecoration: 'underline' }}>
          Crea il tuo tema natale
        </Link>
      </p>

      <div className="footer">
        <Link href="/privacy">Privacy</Link>·
        <Link href="/disclaimer">Disclaimer</Link>·
        <Link href="/faq">?</Link>
      </div>
    </div>
  );
}
