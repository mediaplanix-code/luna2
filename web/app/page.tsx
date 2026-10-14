'use client';

import { useState } from 'react';

export default function Home() {
  const [form, setForm] = useState({
    nome: '',
    email: '',
    birth_date: '',
    birth_time: '',
    birth_city: '',
    wants_telegram: false,
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<any>(null);

  const update = (k: string, v: any) => setForm({ ...form, [k]: v });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('https://luna2-api.onrender.com/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Errore');
      setStatus('ok');
      setMessage(data.message || 'Registrazione completata!');
      setResult(data);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message);
    }
  }

  return (
    <main>
      <h1>Luna2</h1>
      <p>Il tuo tema natale reale. Il tuo oroscopo su Telegram.</p>

      {status === 'ok' && result ? (
        <div className="success">
          <strong>Fatto!</strong> {message}
          {result.chart_preview && (
            <div style={{ marginTop: '1rem' }}>
              <div>Sole: {result.chart_preview.sole?.segno} {result.chart_preview.sole?.grado}°</div>
              <div>Luna: {result.chart_preview.luna?.segno} {result.chart_preview.luna?.grado}°</div>
              <div>Ascendente: {result.chart_preview.ascendente?.segno} {result.chart_preview.ascendente?.grado}°</div>
            </div>
          )}
          {form.wants_telegram && result.access_token && (
            <a
              href={`https://t.me/Luna2OroscopoBot?start=${result.access_token}`}
              style={{
                display: 'block',
                marginTop: '1.5rem',
                padding: '1rem',
                textAlign: 'center',
                background: 'linear-gradient(135deg, #a78bfa, #f472b6)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '0.5rem',
                fontWeight: 600,
              }}
            >
              Apri Telegram e attiva il bot →
            </a>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <label>Nome</label>
          <input value={form.nome} onChange={(e) => update('nome', e.target.value)} required />

          <label>Email</label>
          <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />

          <label>Data di nascita</label>
          <input type="date" value={form.birth_date} onChange={(e) => update('birth_date', e.target.value)} required />

          <label>Ora di nascita (esatta)</label>
          <input type="time" value={form.birth_time} onChange={(e) => update('birth_time', e.target.value)} required />

          <label>Città di nascita</label>
          <input value={form.birth_city} onChange={(e) => update('birth_city', e.target.value)} placeholder="es. Roma, Italia" required />

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input
              type="checkbox"
              checked={form.wants_telegram}
              onChange={(e) => update('wants_telegram', e.target.checked)}
              style={{ width: 'auto' }}
            />
            Voglio ricevere l&apos;oroscopo su Telegram
          </label>

          <button type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Calcolo in corso...' : 'Scopri il tuo tema natale'}
          </button>
        </form>
      )}

      {status === 'error' && <div className="error">Errore: {message}</div>}
    </main>
  );
}
