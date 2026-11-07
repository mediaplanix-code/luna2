'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = "https://luna2-api.onrender.com";

function CompatibilitaContent() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [sesso, setSesso] = useState('Donna');
  const [dataNascita, setDataNascita] = useState('');
  const [oraNascita, setOraNascita] = useState('');
  const [citta, setCitta] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [suggerimenti, setSuggerimenti] = useState<any[]>([]);
  const [showSuggerimenti, setShowSuggerimenti] = useState(false);
  const [errore, setErrore] = useState('');
  const [inCaricamento, setInCaricamento] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('luna2_token');
    if (!t) { router.push('/form'); return; }
    setToken(t);
  }, [router]);

  useEffect(() => {
    if (citta.length < 3) { setSuggerimenti([]); return; }
    const timeout = setTimeout(() => {
      fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(citta)}&limit=5`)
        .then(r => r.json())
        .then(d => { setSuggerimenti(d.features || []); setShowSuggerimenti(true); })
        .catch(() => {});
    }, 500);
    return () => clearTimeout(timeout);
  }, [citta]);

  const selezionaCitta = (feature: any) => {
    const props = feature.properties;
    const coords = feature.geometry.coordinates;
    const nomeCitta = props.city || props.name || props.county || '';
    const paese = props.country || '';
    setCitta(`${nomeCitta}, ${paese}`);
    setLon(coords[0]);
    setLat(coords[1]);
    setShowSuggerimenti(false);
  };

  const invia = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrore('');
    if (!lat || !lon) { setErrore('Seleziona una città dall\'elenco.'); return; }
    if (!token) return;

    setInCaricamento(true);
    try {
      const r = await fetch(`${API_URL}/compatibilita`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          token: token,
          other_name: nome,
          other_birth_date: dataNascita,
          other_birth_time: oraNascita || '12:00',
          other_birth_city: citta,
          other_birth_lat: lat,
          other_birth_lon: lon,
          other_gender: sesso, // <-- Inviato al backend
        }),
      });

      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Errore durante il calcolo');

      router.push(`/compatibilita/risultato?token=${token}`);
    } catch (err: any) {
      setErrore(err.message || 'Errore di connessione');
    } finally {
      setInCaricamento(false);
    }
  };

  return (
    <div className="canvas">
      <div className="topbar">
        <Link href="/sala" className="back">← Indietro</Link>
        <div className="brand">✦ tuFelia</div>
      </div>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 400, textAlign: 'center', marginBottom: '6px' }}>
        Compatibilità
      </h1>
      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '22px' }}>
        Scopri l'intesa con un'altra persona.
      </p>

      <form onSubmit={invia}>
        <div className="field">
          <label>Nome dell'altra persona</label>
          <input type="text" value={nome} onChange={e => setNome(e.target.value)} required placeholder="Il suo nome" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(245,166,35,0.25)', background: 'rgba(255,255,255,0.03)', color: 'var(--text)', fontSize: '14px' }} />
        </div>

        <div className="field">
          <label>Sesso</label>
          <select value={sesso} onChange={e => setSesso(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(245,166,35,0.25)', background: 'rgba(255,255,255,0.03)', color: 'var(--text)', fontSize: '14px' }}>
            <option value="Donna">Donna</option>
            <option value="Uomo">Uomo</option>
            <option value="Altro">Altro</option>
          </select>
        </div>

        <div className="field">
          <label>Data di nascita</label>
          <input type="date" value={dataNascita} onChange={e => setDataNascita(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(245,166,35,0.25)', background: 'rgba(255,255,255,0.03)', color: 'var(--text)', fontSize: '14px' }} />
        </div>

        <div className="field">
          <label>Ora di nascita</label>
          <input type="time" value={oraNascita} onChange={e => setOraNascita(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(245,166,35,0.25)', background: 'rgba(255,255,255,0.03)', color: 'var(--text)', fontSize: '14px' }} />
          <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px' }}>
            Se non conosci l'ora, lascia vuoto (useremo le 12:00).
          </p>
        </div>

        <div className="field" style={{ position: 'relative' }}>
          <label>Città di nascita</label>
          <input type="text" value={citta} onChange={e => setCitta(e.target.value)} required placeholder="Inizia a scrivere..." style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(245,166,35,0.25)', background: 'rgba(255,255,255,0.03)', color: 'var(--text)', fontSize: '14px' }} />
          {showSuggerimenti && suggerimenti.length > 0 && (
            <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a1a', border: '1px solid rgba(245,166,35,0.3)', borderRadius: '8px', listStyle: 'none', padding: '8px 0', margin: '4px 0 0', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
              {suggerimenti.map((f, i) => (
                <li key={i} onClick={() => selezionaCitta(f)} style={{ padding: '10px 16px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {f.properties.name}, {f.properties.country}
                </li>
              ))}
            </ul>
          )}
        </div>

        {errore && <div className="error" style={{ marginTop: '16px' }}>{errore}</div>}

        <button type="submit" disabled={inCaricamento} className="cta" style={{ marginTop: '24px', width: '100%' }}>
          {inCaricamento ? 'Calcolo in corso...' : 'Calcola la compatibilità'}
        </button>
      </form>

      <div className="footer">
        <Link href="/privacy">Privacy</Link>·
        <Link href="/disclaimer">Disclaimer</Link>·
        <Link href="/faq">FAQ</Link>
      </div>
    </div>
  );
}

export default function CompatibilitaPage() {
  return (
    <Suspense fallback={<div className="canvas"><p style={{ textAlign: 'center', marginTop: '40px' }}>Caricamento...</p></div>}>
      <CompatibilitaContent />
    </Suspense>
  );
}
