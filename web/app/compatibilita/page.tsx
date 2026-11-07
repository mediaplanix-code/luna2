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
  
  // Stato per i risultati
  const [risultato, setRisultato] = useState<any>(null);

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
    setRisultato(null); // Resetta il risultato precedente

    try {
      const r = await fetch(`${API_URL}/compatibilita/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome,
          birth_date: dataNascita,
          birth_time: oraNascita || '12:00',
          birth_lat: lat,
          birth_lon: lon,
          sesso: sesso,
        }),
      });

      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Errore durante il calcolo');

      // Salviamo i risultati nello stato per mostrarli
      setRisultato(d);
      
    } catch (err: any) {
      setErrore(err.message || 'Errore di connessione');
    } finally {
      setInCaricamento(false);
    }
  };

  // Se abbiamo un risultato, mostriamo la pagina dei risultati
  if (risultato) {
    let colorePercentuale = '#06D6A0'; // verde
    if (risultato.percentuale < 50) colorePercentuale = '#EF476F'; // rosso
    else if (risultato.percentuale < 70) colorePercentuale = '#F5A623'; // giallo

    return (
      <div className="canvas">
        <div className="topbar">
          <button onClick={() => setRisultato(null)} className="back" style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '16px', cursor: 'pointer' }}>← Indietro</button>
          <div className="brand">✦ tuFelia</div>
        </div>

        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 400, textAlign: 'center', marginBottom: '6px' }}>
          La vostra intesa
        </h1>
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '22px' }}>
          {risultato.persona_a} e {risultato.persona_b}
        </p>

        <div style={{ textAlign: 'center', margin: '30px 0' }}>
          <div style={{ fontSize: '64px', fontWeight: 'bold', color: colorePercentuale, lineHeight: '1' }}>
            {risultato.percentuale}%
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-dim)', marginTop: '10px' }}>
            Compatibilità tra {risultato.segno_a} e {risultato.segno_b}
          </div>
        </div>

        <div className="accordion">
          <div className="section-label" style={{ fontSize: '15px', marginTop: '30px' }}>Amore e Relazioni</div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
            <p style={{ fontSize: '15px', lineHeight: '1.7', margin: 0 }}>{risultato.testi.amore}</p>
            <div style={{ marginTop: '16px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <Link href={`/chat?focus=compatibilita_amore`} className="icon-btn" style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Chiedi alla Chat">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </Link>
              <Link href={`/consulenza?focus=compatibilita_amore`} className="icon-btn accent" style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Approfondisci con la Voce">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
              </Link>
            </div>
          </div>

          <div className="section-label" style={{ fontSize: '15px' }}>Lavoro e Carriera</div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
            <p style={{ fontSize: '15px', lineHeight: '1.7', margin: 0 }}>{risultato.testi.lavoro}</p>
          </div>

          <div className="section-label" style={{ fontSize: '15px' }}>Salute e Benessere</div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
            <p style={{ fontSize: '15px', lineHeight: '1.7', margin: 0 }}>{risultato.testi.salute}</p>
          </div>

          <div className="section-label" style={{ fontSize: '15px' }}>Crescita Personale</div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
            <p style={{ fontSize: '15px', lineHeight: '1.7', margin: 0 }}>{risultato.testi.crescita}</p>
          </div>
        </div>

        <div style={{ marginTop: '30px', textAlign: 'center' }}>
          <Link href="/sala" className="cta" style={{ display: 'inline-block', fontSize: '14px', padding: '12px 24px' }}>
            Torna alla Sala
          </Link>
        </div>

        <div className="footer" style={{ marginTop: '40px' }}>
          <Link href="/privacy">Privacy</Link>·
          <Link href="/disclaimer">Disclaimer</Link>·
          <Link href="/faq">FAQ</Link>
        </div>
      </div>
    );
  }

  // Altrimenti mostriamo il form
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
