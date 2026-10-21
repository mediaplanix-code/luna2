'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Accordion from '../components/Accordion';

type Aspetto = {
  pianeta_a: string;
  pianeta_b: string;
  tipo: string;
  orb: number;
};

const SIMBOLI: Record<string, string> = {
  Ariete: '♈', Toro: '♉', Gemelli: '♊', Cancro: '♋', Leone: '♌', Vergine: '♍',
  Bilancia: '♎', Scorpione: '♏', Sagittario: '♐', Capricorno: '♑', Acquario: '♒', Pesci: '♓',
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

  const [cityQuery, setCityQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingCity, setLoadingCity] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    const t = localStorage.getItem('luna2_token');
    if (!t) {
      router.push('/accedi');
      return;
    }
    setToken(t);

    // Recupera l'ultimo confronto dal profilo, se esiste
    fetch(`https://luna2-api.onrender.com/sala/${t}`)
      .then(r => r.json())
      .then(d => {
        if (d.profile && d.profile.ultima_compatibilita) {
          setRisultato(d.profile.ultima_compatibilita);
        }
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (cityQuery.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }

    setLoadingCity(true);
    setShowSuggestions(true);

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
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingCity(false);
      }
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [cityQuery]);

  function selezionaCitta(s: any) {
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

      <h1 style={{ fontSize: '22px', fontWeight: 400, textAlign: 'center', marginBottom: '6px' }}>
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
            <input 
              value={cityQuery} 
              onChange={(e) => setCityQuery(e.target.value)} 
              placeholder="es. Roma" 
              autoComplete="off" 
              required 
            />
            {loadingCity && <div style={{ fontSize: '12px', color: '#F5A623', marginTop: '6px' }}>Cerco la città...</div>}
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(245,166,35,0.3)', 
              borderRadius: '8px', 
              marginTop: '8px', 
              padding: '4px'
            }}>
              {suggestions.map((s, i) => (
                <div 
                  key={i} 
                  onClick={() => selezionaCitta(s)}
                  style={{ 
                    padding: '10px', 
                    cursor: 'pointer', 
                    borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                    fontSize: '14px'
                  }}
                >
                  {s.label}
                </div>
              ))}
            </div>
          )}

          <button type="submit" className="cta" disabled={loading} style={{ marginTop: '22px' }}>
            {loading ? 'Calcolo la sinastria...' : 'Calcola compatibilità'}
          </button>
          {error && <div className="error" style={{ marginTop: '14px' }}>{error}</div>}
        </form>
      )}

      {risultato && (
        <div>
          <div style={{ textAlign: 'center', margin: '10px 0 20px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '32px' }}>{SIMBOLI[risultato.segno_a]}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{risultato.segno_a}</div>
              </div>
              <div style={{ fontSize: '20px', color: 'var(--text-dim)' }}>&amp;</div>
              <div>
                <div style={{ fontSize: '32px' }}>{SIMBOLI[risultato.segno_b]}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{risultato.segno_b}</div>
              </div>
            </div>
            <h2 style={{ fontSize: '18px', color: '#F5A623', margin: '8px 0 4px 0' }}>
              {risultato.persona_a} e {risultato.persona_b}
            </h2>
            <div style={{ 
              fontSize: '36px', 
              fontWeight: 'bold', 
              color: risultato.percentuale > 60 ? '#06D6A0' : risultato.percentuale > 40 ? '#F5A623' : '#EF476F',
              marginTop: '8px' 
            }}>
              {risultato.percentuale}%
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>di compatibilità complessiva</p>
          </div>

          <div className="section-label">I settori della vostra vita</div>
          
          <div className="accordion">
            <Accordion title="❤️ Amore e Relazioni" bare>
              <p style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '16px' }}>
                {risultato.testi.amore}
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                 <button className="icon-btn" title="Chat" onClick={() => router.push(`${risultato.link.amore.chat}&nome_b=${encodeURIComponent(risultato.persona_b)}`)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </button>
                  <button className="icon-btn accent" title="Voce" onClick={() => router.push(`${risultato.link.amore.voce}&nome_b=${encodeURIComponent(risultato.persona_b)}`)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                  </button>
              </div>
            </Accordion>

            <Accordion title="💼 Carriera e Finanze" bare>
              <p style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '16px' }}>
                {risultato.testi.lavoro}
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                 <button className="icon-btn" title="Chat" onClick={() => router.push(`${risultato.link.lavoro.chat}&nome_b=${encodeURIComponent(risultato.persona_b)}`)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </button>
                  <button className="icon-btn accent" title="Voce" onClick={() => router.push(`${risultato.link.lavoro.voce}&nome_b=${encodeURIComponent(risultato.persona_b)}`)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                  </button>
              </div>
            </Accordion>

            <Accordion title="🌿 Salute e Benessere" bare>
              <p style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '16px' }}>
                {risultato.testi.salute}
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                 <button className="icon-btn" title="Chat" onClick={() => router.push(`${risultato.link.salute.chat}&nome_b=${encodeURIComponent(risultato.persona_b)}`)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </button>
                  <button className="icon-btn accent" title="Voce" onClick={() => router.push(`${risultato.link.salute.voce}&nome_b=${encodeURIComponent(risultato.persona_b)}`)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                  </button>
              </div>
            </Accordion>

            <Accordion title="🌱 Crescita Personale" bare>
              <p style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '16px' }}>
                {risultato.testi.crescita}
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                 <button className="icon-btn" title="Chat" onClick={() => router.push(`${risultato.link.crescita.chat}&nome_b=${encodeURIComponent(risultato.persona_b)}`)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </button>
                  <button className="icon-btn accent" title="Voce" onClick={() => router.push(`${risultato.link.crescita.voce}&nome_b=${encodeURIComponent(risultato.persona_b)}`)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                  </button>
              </div>
            </Accordion>

            <Accordion title="🔮 Previsioni Annuali" bare>
              <p style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '16px' }}>
                {risultato.testi.previsioni}
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                 <button className="icon-btn" title="Chat" onClick={() => router.push(`${risultato.link.previsioni.chat}&nome_b=${encodeURIComponent(risultato.persona_b)}`)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </button>
                  <button className="icon-btn accent" title="Voce" onClick={() => router.push(`${risultato.link.previsioni.voce}&nome_b=${encodeURIComponent(risultato.persona_b)}`)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                  </button>
              </div>
            </Accordion>
          </div>

          <div className="section-label" style={{ marginTop: '30px' }}>Dettagli tecnici</div>
          <div className="accordion">
            <Accordion title={`Il tema di ${risultato.persona_b}`} bare>
              <div className="identikit">
                {risultato.pianeti_b?.Sole && (
                  <div className="row">
                    <span className="label">Sole</span>
                    <span className="value"><span className="sym">{SIMBOLI[risultato.pianeti_b.Sole.segno]}</span> {risultato.pianeti_b.Sole.segno}</span>
                  </div>
                )}
                {risultato.pianeti_b?.Luna && (
                  <div className="row">
                    <span className="label">Luna</span>
                    <span className="value"><span className="sym">{SIMBOLI[risultato.pianeti_b.Luna.segno]}</span> {risultato.pianeti_b.Luna.segno}</span>
                  </div>
                )}
                {risultato.pianeti_b?.Mercurio && (
                  <div className="row">
                    <span className="label">Mercurio</span>
                    <span className="value"><span className="sym">{SIMBOLI[risultato.pianeti_b.Mercurio.segno]}</span> {risultato.pianeti_b.Mercurio.segno}</span>
                  </div>
                )}
              </div>
            </Accordion>
            
            <Accordion title="Gli aspetti principali" bare>
              <table className="data" style={{ marginBottom: '16px' }}>
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
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                 <button className="icon-btn" title="Chat" onClick={() => router.push(`${risultato.link.generico.chat}&nome_b=${encodeURIComponent(risultato.persona_b)}`)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </button>
                  <button className="icon-btn accent" title="Voce" onClick={() => router.push(`${risultato.link.generico.voce}&nome_b=${encodeURIComponent(risultato.persona_b)}`)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19
