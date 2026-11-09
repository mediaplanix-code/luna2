'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = "https://luna2-api.onrender.com";

function FormContent() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [sesso, setSesso] = useState('Donna');
  const [dataNascita, setDataNascita] = useState('');
  const [oraNascita, setOraNascita] = useState('');
  const [citta, setCitta] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [suggerimenti, setSuggerimenti] = useState<any[]>([]);
  const [showSuggerimenti, setShowSuggerimenti] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [errore, setErrore] = useState('');
  const [messaggioSuccesso, setMessaggioSuccesso] = useState(''); // <-- NUOVO
  const [inCaricamento, setInCaricamento] = useState(false);

  useEffect(() => {
    if (citta.length < 3) {
      setSuggerimenti([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(citta)}&limit=5`)
        .then(r => r.json())
        .then(d => {
          setSuggerimenti(d.features || []);
          setShowSuggerimenti(true);
        })
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
    setMessaggioSuccesso('');

    if (!privacy) {
      setErrore('Devi accettare l\'informativa sulla privacy per proseguire.');
      return;
    }
    if (!lat || !lon) {
      setErrore('Seleziona una città dall\'elenco.');
      return;
    }

    setInCaricamento(true);

    try {
      const r = await fetch(`${API_URL}/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome,
          email: email,
          sesso: sesso,
          birth_date: dataNascita,
          birth_time: oraNascita || '12:00',
          birth_city: citta,
          birth_lat: lat,
          birth_lon: lon,
          wants_telegram: false,
          marketing_consent: marketing,
        }),
      });

      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Errore durante la registrazione');

      // CONTROLLO: se serve la verifica email, non entriamo
      if (d.email_verification_required) {
        // Invece del messaggio in alto, andiamo alla pagina di conferma
        router.push('/conferma-email');
        return;
      }

      // Se è un utente già confermato, entriamo
      localStorage.setItem('luna2_token', d.access_token);
      localStorage.setItem('luna2_nome', nome);
      router.push('/sala');
    } catch (err: any) {
      setErrore(err.message || 'Errore di connessione');
    } finally {
      setInCaricamento(false);
    }
  };

  return (
    <div className="canvas">
      <div className="topbar">
        <Link href="/" className="back">← Home</Link>
        <div className="brand">✦ tuFelia</div>
      </div>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 400, textAlign: 'center', marginBottom: '6px' }}>
        Il tuo tema natale
      </h1>
      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '22px' }}>
        Inserisci i tuoi dati per iniziare.
      </p>

      {messaggioSuccesso && (
        <div style={{ background: 'rgba(6,214,160,0.08)', border: '1px solid rgba(6,214,160,0.3)', borderRadius: '10px', padding: '20px', marginBottom: '22px', textAlign: 'center' }}>
          <p style={{ fontSize: '15px', color: '#06D6A0', lineHeight: '1.6' }}>{messaggioSuccesso}</p>
        </div>
      )}

      <form onSubmit={invia}>
        <div className="field">
          <label>Nome</label>
          <input type="text" value={nome} onChange={e => setNome(e.target.value)} required placeholder="Il tuo nome" />
        </div>

        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="La tua email" />
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
          <input type="date" value={dataNascita} onChange={e => setDataNascita(e.target.value)} required />
        </div>

        <div className="field">
          <label>Ora di nascita</label>
          <input type="time" value={oraNascita} onChange={e => setOraNascita(e.target.value)} />
          <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px' }}>
            Se non conosci l'ora esatta, lascia vuoto (useremo le 12:00).
          </p>
        </div>

        <div className="field" style={{ position: 'relative' }}>
          <label>Città di nascita</label>
          <input type="text" value={citta} onChange={e => setCitta(e.target.value)} required placeholder="Inizia a scrivere..." />
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

        <div style={{ marginTop: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
            <input type="checkbox" checked={privacy} onChange={e => setPrivacy(e.target.checked)} required />
            Accetto l'informativa sulla privacy (obbligatorio)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', marginTop: '12px' }}>
            <input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)} />
            Acconsento a ricevere comunicazioni e offerte (facoltativo)
          </label>
        </div>

        {errore && <div className="error" style={{ marginTop: '16px' }}>{errore}</div>}

        <button type="submit" disabled={inCaricamento} className="cta" style={{ marginTop: '24px', width: '100%' }}>
          {inCaricamento ? 'Calcolo in corso...' : 'Calcola il mio tema natale'}
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

export default function FormPage() {
  return (
    <Suspense fallback={<div className="canvas"><p style={{ textAlign: 'center', marginTop: '40px' }}>Caricamento...</p></div>}>
      <FormContent />
    </Suspense>
  );
}
