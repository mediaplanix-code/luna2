'use client';

import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [step, setStep] = useState<'form' | 'result'>('form');
  const [form, setForm] = useState({
    nome: '',
    email: '',
    birth_date: '',
    birth_time: '',
    birth_city: '',
    birth_country: '',
    birth_lat: 0,
    birth_lon: 0,
    wants_telegram: false,
  });
  const [cityQuery, setCityQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<any>(null);
  const debounceRef = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const update = (k: string, v: any) => setForm({ ...form, [k]: v });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (cityQuery.length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(cityQuery)}&limit=5&lang=default`;
        const res = await fetch(url);
        const data = await res.json();
        const items = (data.features || []).map((f: any) => ({
          label: [f.properties.name, f.properties.state, f.properties.country]
            .filter(Boolean)
            .join(', '),
          name: f.properties.name,
          country: f.properties.country,
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
        }));
        setSuggestions(items);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [cityQuery]);

  function pickCity(s: any) {
    setForm({
      ...form,
      birth_city: s.label,
      birth_country: s.country || '',
      birth_lat: s.lat,
      birth_lon: s.lon,
    });
    setCityQuery(s.label);
    setShowSuggestions(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.birth_lat || !form.birth_lon) {
      setStatus('error');
      setMessage('Seleziona la città di nascita dai suggerimenti.');
      return;
    }
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
        <div ref={wrapperRef} style={{ position: 'relative' }}>
          <input
            value={cityQuery}
            onChange={(e) => {
              setCityQuery(e.target.value);
              if (e.target.value !== form.birth_city) {
                update('birth_city', '');
                update('birth_lat', 0);
                update('birth_lon', 0);
              }
            }}
            placeholder="es. Roma"
            autoComplete="off"
            required
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#16162a',
                border: '1px solid #2a2a3e',
                borderRadius: '0.5rem',
                listStyle: 'none',
                margin: '0.25rem 0 0 0',
                padding: 0,
                zIndex: 10,
                maxHeight: '220px',
                overflowY: 'auto',
              }}
            >
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  onClick={() => pickCity(s)}
                  style={{
                    padding: '0.75rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid #2a2a3e',
                    fontSize: '0.9rem',
                  }}
                >
                  {s.label}
                </li>
              ))}
            </ul>
          )}
        </div>

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
