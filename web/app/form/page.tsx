'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function FormPage() {
  const router = useRouter();
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    if (cityQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(cityQuery)}&limit=6&lang=default`;
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
        setShowSuggestions(items.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 100);
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
    setSuggestions([]);
    setShowSuggestions(false);
  }

  async function resolveCityIfNeeded(): Promise<{ lat: number; lon: number; label: string } | null> {
    if (form.birth_lat && form.birth_lon && form.birth_city) {
      return { lat: form.birth_lat, lon: form.birth_lon, label: form.birth_city };
    }
    if (!cityQuery || cityQuery.length < 2) return null;
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(cityQuery)}&limit=1&lang=default`;
      const res = await fetch(url);
      const data = await res.json();
      const f = (data.features || [])[0];
      if (!f) return null;
      const label = [f.properties.name, f.properties.state, f.properties.country]
        .filter(Boolean)
        .join(', ');
      return {
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
        label,
      };
    } catch {
      return null;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.birth_lat || !form.birth_lon) {
      setLoading(true);
      const resolved = await resolveCityIfNeeded();
      if (!resolved) {
        setError('Città non trovata. Scrivi il nome della città.');
        setLoading(false);
        return;
      }
      form.birth_lat = resolved.lat;
      form.birth_lon = resolved.lon;
      form.birth_city = resolved.label;
    }

    setLoading(true);
    try {
      const res = await fetch('https://luna2-api.onrender.com/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Errore ${res.status}`);
      if (!data.access_token) throw new Error('Il server non ha restituito un token.');

      localStorage.setItem('luna2_token', data.access_token);
      localStorage.setItem('luna2_nome', form.nome);
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
        Il tuo tema natale
      </h1>
      <p style={{
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--text-dim)',
        marginBottom: '22px'
      }}>
        Inserisci i tuoi dati di nascita
      </p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Nome</label>
          <input value={form.nome} onChange={(e) => update('nome', e.target.value)} required />
        </div>

        <div className="field">
          <label>Email</label>
          <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
        </div>

        <div className="field">
          <label>Data di nascita</label>
          <input type="date" value={form.birth_date} onChange={(e) => update('birth_date', e.target.value)} required />
        </div>

        <div className="field">
          <label>Ora di nascita (esatta)</label>
          <input type="time" value={form.birth_time} onChange={(e) => update('birth_time', e.target.value)} required />
          <div className="hint">Serve per calcolare correttamente Ascendente e Case.</div>
        </div>

        <div className="field">
          <label>Città di nascita</label>
          <div ref={wrapperRef} className="city-wrap">
            <input
              value={cityQuery}
              onChange={(e) => setCityQuery(e.target.value)}
              placeholder="es. Roma"
              autoComplete="off"
              required
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="city-suggestions">
                {suggestions.map((s, i) => (
                  <li
                    key={i}
                    onMouseDown={(e) => { e.preventDefault(); pickCity(s); }}
                    onTouchStart={(e) => { e.preventDefault(); pickCity(s); }}
                  >
                    {s.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="hint">
            Scrivi 2-3 lettere e scegli dalla lista.
          </div>
        </div>

        <button type="submit" className="cta" disabled={loading}
          style={{ marginTop: '22px' }}>
          {loading ? 'Calcolo in corso...' : 'Scopri il tuo tema natale'}
        </button>

        {error && (
          <div className="error" style={{ marginTop: '14px' }}>
            {error}
          </div>
        )}
      </form>

      <div className="footer">
        <Link href="/privacy">Privacy</Link>·
        <Link href="/disclaimer">Disclaimer</Link>·
        <Link href="/faq">?</Link>
      </div>
    </div>
  );
}
