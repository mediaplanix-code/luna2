'use client';

import { useState } from 'react';

export default function Home() {
  const [step, setStep] = useState<'form' | 'result'>('form');
  const [form, setForm] = useState({
    nome: '',
    email: '',
    birth_date: '',
    birth_time: '',
    birth_city: '',
    wants_telegram: false,
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<any>(null);

  const update = (k: string, v: any) => setForm({ ...form, [k]: v });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('https://luna2-api.onrender.com/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Errore');
      setResult(data);
      setStep('result');
      setStatus('idle');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message);
    }
  }

  if (step === 'result' && result) {
    const sole = result.chart_preview?.sole;
    const luna = result.chart_preview?.luna;
    const asc = result.chart_preview?.ascendente;

    return (
      <main>
        <h1>Tema natale</h1>
        <p>Ecco i tuoi dati astronomici reali.</p>

        <div className="success">
          <div style={{ marginBottom: '1rem' }}>
            <strong>Sole:</strong> {sole?.segno} {sole?.grado}°
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Luna:</strong> {luna?.segno} {luna?.grado}°
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Ascendente:</strong> {asc?.segno} {asc?.grado}°
          </div>

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
              Apri Telegram e attiva l&apos;oroscopo →
            </a>
          )}
        </div>
      </main>
    );
  }

  return (
    <main>
      <h1>Luna2</h1>
      <p>Il tuo tema natale reale. Il tuo oroscopo su Telegram.</p>

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

      {status === 'error' && <div className="error">Errore: {message}</div>}
    </main>
  );
}
