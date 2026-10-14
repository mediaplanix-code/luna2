'use client';

import { useState } from 'react';

export default function Home() {
  const [form, setForm] = useState({
    nome: '',
    email: '',
    birth_date: '',
    birth_time: '',
    birth_city: '',
    telegram_id: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const update = (k: string, v: string) => setForm({ ...form, [k]: v });

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
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message);
    }
  }

  return (
    <main>
      <h1>Luna2</h1>
      <p>Il tuo tema natale reale. Il tuo oroscopo su WhatsApp e Telegram.</p>

      {status === 'ok' ? (
        <div className="success">
          <strong>Fatto!</strong> {message}
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

          <label>Telegram username (opzionale)</label>
          <input value={form.telegram_id} onChange={(e) => update('telegram_id', e.target.value)} placeholder="@tuonome" />

          <button type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Calcolo in corso...' : 'Scopri il tuo tema natale'}
          </button>
        </form>
      )}

      {status === 'error' && <div className="error">Errore: {message}</div>}
    </main>
  );
}
