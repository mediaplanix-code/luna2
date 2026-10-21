'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Aspetto = {
  pianeta_a: string;
  pianeta_b: string;
  tipo: string;
  orb: number;
  punteggio: number;
};

export default function CompatibilitaPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [risultato, setRisultato] = useState<any>(null);

  const [form, setForm] = useState({
    nome: '',
    birth_date: '',
    birth_time: '',
    birth_city: '',
    birth_lat: 0,
    birth_lon: 0,
  });

  // Autocomplete città (semplificato)
  const [cityQuery, setCityQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingCity, setLoadingCity] = useState(false);
  const debounceRef = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = localStorage.getItem('luna2_token');
    if (!t) {
      router.push('/accedi');
      return;
    }
    setToken(t);
  }, [router]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (cityQuery.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }

    setLoadingCity(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(cityQuery)}&limit=5&lang=default`;
        const res = await fetch(url);
        const data = await res.json();
        const items = (data.features || []).map((f: any) => ({
          label: [f.properties.name, f.properties.state, f.properties.country].filter(Boolean).join(', '),
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
        }));
        setSuggestions(items);
        setShowSuggestions(items.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingCity(false);
      }
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [cityQuery]);

  function pickCity(e: React.MouseEvent, s: any) {
    e.preventDefault();
    e.stopPropagation();
    setForm(prev => ({ ...prev, birth_city: s.label, birth_lat: s.lat, birth_lon: s.lon }));
    setCityQuery(s.label);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!form.birth_lat || !form.birth_lon) {
      setError('Scegli una città dalla lista.');
      return;
    }

    setLoading(true);
    setError('');
    setRisultato(null);

    try {
      const res = await fetch(`https://luna2-api.onrender.com/compatibilita/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome,
          birth_date: form.birth_date,
          birth_time: form.birth_time,
          birth_lat: form.birth_lat,
          birth_lon: form.birth_lon,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Errore ${res.status}`);
      setRisultato(data);
    } catch (err: any) {
      setError(err.message || 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="canvas">
      <div className="topbar">
        <Link href="/sala" className="back">← Sala</Link>
        <div className="brand">✦ Luna Astrologica</div>
      </div>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 400, textAlign: 'center', marginBottom: '6px' }}>
        Compatibilità
      </h1>
      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '22px' }}>
        Inserisci i dati di nascita dell&apos;altra persona.
      </p>

      {!risultato && (
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Nome</label>
            <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          </div>
          <div className="field">
            <label>Data di nascita</label>
            <input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} required />
          </div>
          <div className="field">
            <label>Ora di nascita (esatta)</label>
            <input type="time" value={form.birth_time} onChange={(e) => setForm({ ...form, birth_time: e.target.value })} required />
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
              {loadingCity && <div className="city-loading">Cerco…</div>}
              {showSuggestions && suggestions.length > 0 && (
                <ul className="city-suggestions">
                  {suggestions.map((s, i) => (
                    <li key={i} onMouseDown={(e) => pickCity(e, s)} style={{ cursor: 'pointer', padding: '8px' }}>
                      {s.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <button type="submit" className="cta" disabled={loading} style={{ marginTop: '22px' }}>
            {loading ? 'Calcolo la sinastria...' : 'Calcola compatibilità'}
          </button>
          {error && <div className="error" style={{ marginTop: '14px' }}>{error}</div>}
        </form>
      )}

      {risultato && (
        <div>
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#F5A623' }}>
              {risultato.persona_a} e {risultato.persona_b}
            </h2>
            <div style={{ 
              fontSize: '48px', 
              fontWeight: 'bold', 
              color: risultato.percentuale > 60 ? '#06D6A0' : risultato.percentuale > 40 ? '#F5A623' : '#EF476F',
              marginTop: '10px' 
            }}>
              {risultato.percentuale}%
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>di compatibilità</p>
          </div>

          <div className="section-label">I vostri aspetti principali</div>
          <table className="data">
            <thead>
              <tr><th>Pianeta A</th><th>Aspetto</th><th>Pianeta B</th><th>Orbe</th></tr>
            </thead>
            <tbody>
              {risultato.aspetti.map((a: Aspetto, i: number) => (
                <tr key={i}>
                  <td>{a.pianeta_a}</td>
                  <td>{a.tipo}</td>
                  <td>{a.pianeta_b}</td>
                  <td>{a.orb}°</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: '30px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginBottom: '16px' }}>
              Vuoi sapere cosa significano questi numeri per la vostra relazione?
            </p>
            <Link href="/consulenza" className="cta" style={{ display: 'inline-block' }}>
              Approfondisci con la voce · €19
            </Link>
          </div>

          <button 
            onClick={() => { setRisultato(null); setForm({ nome: '', birth_date: '', birth_time: '', birth_city: '', birth_lat: 0, birth_lon: 0 }); setCityQuery(''); }}
            className="cta" 
            style={{ marginTop: '16px', background: 'transparent', border: '1px solid var(--text-dim)', color: 'var(--text-dim)', width: '100%' }}
          >
            Fai un altro confronto
          </button>
        </div>
      )}

      <div className="footer">
        <Link href="/privacy">Privacy</Link>·
        <Link href="/disclaimer">Disclaimer</Link>·
        <Link href="/faq">?</Link>
      </div>
    </div>
  );
}
