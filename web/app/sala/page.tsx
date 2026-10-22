'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Accordion from '../components/Accordion';
import Wheel from '../components/Wheel';

const SIMBOLI: Record<string, string> = {
  Ariete: '♈', Toro: '♉', Gemelli: '♊', Cancro: '♋',
  Leone: '♌', Vergine: '♍', Bilancia: '♎', Scorpione: '♏',
  Sagittario: '♐', Capricorno: '♑', Acquario: '♒', Pesci: '♓',
};

const COMPATIBILI: Record<string, string[]> = {
  Ariete: ['Leone', 'Sagittario', 'Gemelli', 'Acquario'],
  Toro: ['Vergine', 'Capricorno', 'Cancro', 'Pesci'],
  Gemelli: ['Bilancia', 'Acquario', 'Ariete', 'Leone'],
  Cancro: ['Scorpione', 'Pesci', 'Toro', 'Vergine'],
  Leone: ['Ariete', 'Sagittario', 'Gemelli', 'Bilancia'],
  Vergine: ['Toro', 'Capricorno', 'Cancro', 'Scorpione'],
  Bilancia: ['Gemelli', 'Acquario', 'Leone', 'Sagittario'],
  Scorpione: ['Cancro', 'Pesci', 'Vergine', 'Capricorno'],
  Sagittario: ['Ariete', 'Leone', 'Bilancia', 'Acquario'],
  Capricorno: ['Toro', 'Vergine', 'Scorpione', 'Pesci'],
  Acquario: ['Gemelli', 'Bilancia', 'Ariete', 'Sagittario'],
  Pesci: ['Cancro', 'Scorpione', 'Toro', 'Capricorno'],
};

function lonToSign(lon: number): string {
  const segni = ['Ariete', 'Toro', 'Gemelli', 'Cancro', 'Leone', 'Vergine',
    'Bilancia', 'Scorpione', 'Sagittario', 'Capricorno', 'Acquario', 'Pesci'];
  const idx = Math.floor(((lon % 360) + 360) % 360 / 30);
  return segni[idx];
}

function formatGrado(lon: number): string {
  const deg = ((lon % 360) + 360) % 360;
  const g = Math.floor(deg % 30);
  const m = Math.floor((deg % 1) * 60);
  return `${g}°${String(m).padStart(2, '0')}'`;
}

function AzioniTecniche({ argomento, testo }: { argomento: string, testo: string }) {
  const router = useRouter();
  return (
    <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-dim)', marginBottom: '12px' }}>
        {testo}
      </div>
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
        <button className="icon-btn" style={{ width: '48px', height: '48px' }} title="Chiedi alla Chat" onClick={() => router.push(`/chat?focus=${argomento}`)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </button>
        <button className="icon-btn accent" style={{ width: '48px', height: '48px' }} title="Approfondisci con la Voce" onClick={() => router.push(`/consulenza?focus=${argomento}`)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
        </button>
      </div>
    </div>
  );
}

function SalaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [settori, setSettori] = useState<any>(null);
  const [loadingSettori, setLoadingSettori] = useState(false);
  const [oroscopo, setOroscopo] = useState<string | null>(null);
  const [loadingOroscopo, setLoadingOroscopo] = useState(false);

  useEffect(() => {
    const tokenDaUrl = searchParams.get('token');
    if (tokenDaUrl) {
      localStorage.setItem('luna2_token', tokenDaUrl);
    }
    const t = tokenDaUrl || localStorage.getItem('luna2_token');
    if (!t) {
      router.push('/form');
      return;
    }
    setToken(t);

    fetch(`https://luna2-api.onrender.com/sala/${t}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.detail) throw new Error(d.detail);
        setData(d);
        setStatus('ok');
      })
      .catch((e) => {
        setStatus('error');
        setMessage(e.message);
      });
  }, [router, searchParams]);

  useEffect(() => {
    if (!token) return;
    
    setLoadingSettori(true);
    fetch(`https://luna2-api.onrender.com/settori/${token}`)
      .then(r => r.json())
      .then(d => {
        if (!d.detail) setSettori(d);
      })
      .catch(() => {})
      .finally(() => setLoadingSettori(false));

    setLoadingOroscopo(true);
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 30000);

    fetch(`https://luna2-api.onrender.com/oroscopo/${token}`, { signal: abortController.signal })
      .then(r => r.json())
      .then(d => {
        if (d.oroscopo) setOroscopo(d.oroscopo);
      })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timeoutId);
        setLoadingOroscopo(false);
      });
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="canvas">
        <div className="topbar">
          <div className="brand">✦ Luna Astrologica</div>
        </div>
        <p style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-dim)', fontSize: '16px' }}>
          Calcolo in corso...
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="canvas">
        <div className="topbar">
          <Link href="/" className="back">← Home</Link>
          <div className="brand">✦ Luna Astrologica</div>
        </div>
        <div className="error">Errore: {message}</div>
      </div>
    );
  }

  const nome = data.profile.nome;
  const planets = data.chart.planets;
  const houses = data.chart.houses;
  const aspects = data.chart.aspects;
  const ascLon = data.chart.ascendant?.longitude;

  const soleSegno = planets.Sole?.segno || 'Ariete';
  const lunaSegno = planets.Luna?.segno || 'Ariete';
  const ascSegno = ascLon !== undefined ? lonToSign(ascLon) : '—';
  const mcSegno = data.chart.mc?.longitude !== undefined ? lonToSign(data.chart.mc.longitude) : '—';

  const compatibili = COMPATIBILI[soleSegno] || [];
  const transitiList = (data.transits?.aspects_to_natal || []).slice(0, 5);
  const segnali = data.segnali || [];

  return (
    <div className="canvas">

      <div className="topbar">
        <div className="brand" style={{ fontSize: '16px' }}>✦ Luna Astrologica</div>
        <div className="user" style={{ fontSize: '14px' }}>{nome} ▾</div>
      </div>

      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>Ciao {nome}.</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-dim)' }}>Ecco il tuo cielo oggi.</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '10px' }}>
        <div style={{ flex: '0 0 35%', textAlign: 'center' }}>
          <div style={{ fontSize: '80px', lineHeight: '1', color: '#F5A623' }}>{SIMBOLI[soleSegno]}</div>
          <div style={{ fontSize: '20px', marginTop: '8px' }}>{soleSegno}</div>
        </div>
        <div style={{ flex: '1' }}>
          <div className="identikit" style={{ margin: 0 }}>
            <div className="row" style={{ fontSize: '15px', padding: '10px 0' }}>
              <span className="label">Ascendente</span>
              <span className="value"><span className="sym" style={{ fontSize: '20px' }}>{SIMBOLI[ascSegno] || '✦'}</span> {ascSegno}</span>
            </div>
            <div className="row" style={{ fontSize: '15px', padding: '10px 0' }}>
              <span className="label">Luna</span>
              <span className="value"><span className="sym" style={{ fontSize: '20px' }}>{SIMBOLI[lunaSegno]}</span> {lunaSegno}</span>
            </div>
            <div className="row" style={{ fontSize: '15px', padding: '10px 0' }}>
              <span className="label">Medio Cielo</span>
              <span className="value"><span className="sym" style={{ fontSize: '20px' }}>{SIMBOLI[mcSegno] || '✦'}</span> {mcSegno}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="section-label" style={{ fontSize: '15px', marginTop: '30px' }}>Segni compatibili</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '10px' }}>
        {compatibili.map((s) => (
          <div key={s} style={{ 
            background: 'rgba(255,255,255,0.03)', 
            border: '1px solid rgba(245,166,35,0.2)', 
            borderRadius: '8px', 
            padding: '12px 4px', 
            textAlign: 'center' 
          }}>
            <div style={{ fontSize: '24px', color: '#F5A623', marginBottom: '4px' }}>{SIMBOLI[s]}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{s}</div>
          </div>
        ))}
      </div>

      <div className="section-label" style={{ fontSize: '15px' }}>La tua ruota zodiacale</div>
      <div className="wheel-wrap">
        <Wheel
          planets={planets}
          aspects={aspects}
          ascendant={ascLon || 0}
          houses={houses}
          size={500}
        />
      </div>

      <div className="section-label" style={{ fontSize: '15px' }}>Il tuo oroscopo settimanale</div>
      <div className="accordion">
        <Accordion title="Leggi l'oroscopo della settimana" bare defaultOpen={true}>
          {loadingOroscopo ? (
            <p style={{ fontSize: '14px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
              Sto interrogando le stelle... (potrebbe volerci mezzo minuto)
            </p>
          ) : oroscopo ? (
            <p style={{ fontSize: '15px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
              {oroscopo}
            </p>
          ) : (
            <p style={{ fontSize: '14px', color: 'var(--text-dim)' }}>
              Nessun oroscopo disponibile in questo momento. Riprova più tardi.
            </p>
          )}
        </Accordion>
      </div>

      {/* SEGNALI DALLE STELLE */}
      {segnali.length > 0 && (
        <>
          <div className="section-label" style={{ fontSize: '15px' }}>Segnali dalle stelle</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '10px' }}>
            {segnali.map((s: any, i: number) => {
              // Estrai pianeta, aspetto, punto dal campo 'descrizione' (es. "Saturno_quadratura_Sole")
              const parti = s.descrizione.split('_');
              const pianeta = parti[0] || '';
              const aspetto = parti[1] || '';
              const punto = parti[2] || '';
              return (
                <div key={i} style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid rgba(245,166,35,0.3)', 
                  borderRadius: '10px', 
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                      {s.data_evento ? new Date(s.data_evento).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }) : 'In arrivo'}
                    </div>
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: '18px', marginBottom: '8px', color: '#F5A623' }}>
                      {pianeta} in {aspetto} al tuo {punto}
                    </div>
                    <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-dim)', marginBottom: '16px' }}>
                      Un transito importante che porterà cambiamenti. Approfondisci per scoprire cosa significa per te.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button className="icon-btn" title="Chat" onClick={() => router.push(`/chat?focus=tema_transiti`)}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </button>
                    <button className="icon-btn accent" title="Voce" onClick={() => router.push(`/consulenza?focus=tema_transiti`)}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="section-label" style={{ fontSize: '15px' }}>I tuoi dati</div>
      <div className="accordion">
        <Accordion title="Pianeti">
          <table className="data" style={{ fontSize: '14px' }}>
            <thead>
              <tr><th>Pianeta</th><th>Segno</th><th>Grado</th><th>Casa</th></tr>
            </thead>
            <tbody>
              {Object.entries(planets).map(([nomeP, val]: any) => (
                <tr key={nomeP}>
                  <td>{nomeP}</td>
                  <td>{val.segno}</td>
                  <td>{formatGrado(val.longitude)}</td>
                  <td>{data.chart.planets_in_houses?.[nomeP] || '—'}ª</td>
                </tr>
              ))}
            </tbody>
          </table>
          <AzioniTecniche argomento="tema_pianeti" testo="Approfondisci il significato" />
        </Accordion>

        <Accordion title="Case">
          <table className="data" style={{ fontSize: '14px' }}>
            <thead>
              <tr><th>Casa</th><th>Segno</th><th>Grado</th></tr>
            </thead>
            <tbody>
              {houses.map((cusp: number, i: number) => (
                <tr key={i}>
                  <td>{i + 1}ª</td>
                  <td>{lonToSign(cusp)}</td>
                  <td>{formatGrado(cusp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <AzioniTecniche argomento="tema_case" testo="Approfondisci il significato" />
        </Accordion>

        <Accordion title="Aspetti">
          <table className="data" style={{ fontSize: '14px' }}>
            <thead>
              <tr><th>Pianeta A</th><th>Aspetto</th><th>Pianeta B</th><th>Orbe</th></tr>
            </thead>
            <tbody>
              {aspects.slice(0, 15).map((a: any, i: number) => (
                <tr key={i}>
                  <td>{a.pianeta1}</td>
                  <td>{a.tipo}</td>
                  <td>{a.pianeta2}</td>
                  <td>{a.orb}°</td>
                </tr>
              ))}
            </tbody>
          </table>
          <AzioniTecniche argomento="tema_aspetti" testo="Approfondisci il significato" />
        </Accordion>

        <Accordion title="Transiti">
          <table className="data" style={{ fontSize: '14px' }}>
            <thead>
              <tr><th>Transito</th><th>Aspetto</th><th>Al tuo</th
