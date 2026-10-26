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

function distanzaTempo(dataEvento: string): string {
  try {
    const adesso = new Date();
    const evento = new Date(dataEvento);
    const diffMesi = Math.round((evento.getTime() - adesso.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    if (diffMesi <= 0) return "in corso d'opera";
    if (diffMesi === 1) return "il mese prossimo";
    if (diffMesi < 12) return `tra ${diffMesi} mesi`;
    const anni = Math.round(diffMesi / 12);
    return anni === 1 ? "tra un anno" : `tra ${anni} anni`;
  } catch {
    return "in arrivo";
  }
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
  const segnali = (data.segnali || []).slice(0, 3);

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

      {/* SEGNALI DALLE STELLE (UNICO BLOCCO, TESTO PUNTEGGIATO) */}
      {segnali.length > 0 && (
        <>
          <div className="section-label" style={{ fontSize: '15px' }}>Segnali dalle stelle</div>
          <div className="accordion">
            <Accordion title="I prossimi transiti importanti" bare>
              <div style={{ fontSize: '15px', lineHeight: '1.8', color: 'var(--text)' }}>
                {segnali.map((s: any, i: number) => {
                  const pianeta = s.pianeta || '—';
                  const aspetto = s.aspetto || '—';
                  const punto = s.punto_natale || '—';
                  const tempo = distanzaTempo(s.data_evento);
                  
                  return (
                    <div key={i} style={{ marginBottom: '8px' }}>
                      • <strong style={{ color: '#F5A623' }}>{tempo}</strong>: {pianeta} in {aspetto} al tuo {punto}.
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-dim)', marginBottom: '12px' }}>
                  Approfondisci
                </div>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                  <button className="icon-btn" style={{ width: '48px', height: '48px' }} title="Chiedi alla Chat" onClick={() => router.push('/chat?focus=tema_transiti')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </button>
                  <button className="icon-btn accent" style={{ width: '48px', height: '48px' }} title="Approfondisci con la Voce" onClick={() => router.push('/consulenza?focus=tema_transiti')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                  </button>
                </div>
              </div>
            </Accordion>
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
              <tr><th>Transito</th><th>Aspetto</th><th>Al tuo</th><th>Orbe</th></tr>
            </thead>
            <tbody>
              {transitiList.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                  Nessun transito rilevante oggi
                </td></tr>
              ) : transitiList.map((t: any, i: number) => (
                <tr key={i}>
                  <td>{t.transito}</td>
                  <td>{t.tipo}</td>
                  <td>{t.natale}</td>
                  <td>{t.orb}°</td>
                </tr>
              ))}
            </tbody>
          </table>
          <AzioniTecniche argomento="tema_transiti" testo="Approfondisci il significato" />
        </Accordion>
      </div>

      <div className="section-label" style={{ fontSize: '15px' }}>Esplora i tuoi settori</div>
      <div className="accordion">
        <Accordion title="❤️ Amore e Relazioni" bare>
          <p style={{ fontSize: '15px', lineHeight: '1.7', marginBottom: '16px' }}>
            {loadingSettori ? 'Sto leggendo le stelle...' : (settori?.amore || '...')}
          </p>
          <AzioniTecniche argomento="tema_amore" testo="Approfondisci" />
        </Accordion>

        <Accordion title="💼 Carriera e Finanze" bare>
          <p style={{ fontSize: '15px', lineHeight: '1.7', marginBottom: '16px' }}>
            {loadingSettori ? 'Sto leggendo le stelle...' : (settori?.lavoro || '...')}
          </p>
          <AzioniTecniche argomento="tema_lavoro" testo="Approfondisci" />
        </Accordion>

        <Accordion title="🌿 Salute e Benessere" bare>
          <p style={{ fontSize: '15px', lineHeight: '1.7', marginBottom: '16px' }}>
            {loadingSettori ? 'Sto leggendo le stelle...' : (settori?.salute || '...')}
          </p>
          <AzioniTecniche argomento="tema_salute" testo="Approfondisci" />
        </Accordion>

        <Accordion title="🌱 Crescita Personale" bare>
          <p style={{ fontSize: '15px', lineHeight: '1.7', marginBottom: '16px' }}>
            {loadingSettori ? 'Sto leggendo le stelle...' : (settori?.crescita || '...')}
          </p>
          <AzioniTecniche argomento="tema_crescita" testo="Approfondisci" />
        </Accordion>

        <Accordion title="🔮 Previsioni Annuali" bare>
          <p style={{ fontSize: '15px', lineHeight: '1.7', marginBottom: '16px' }}>
            {loadingSettori ? 'Sto leggendo le stelle...' : (settori?.previsioni || '...')}
          </p>
          <AzioniTecniche argomento="tema_previsioni" testo="Approfondisci" />
        </Accordion>
      </div>

      {/* ============ SOGNI (NUOVO BLOCCO) ============ */}
      <div className="section-label" style={{ marginTop: '30px', fontSize: '15px' }}>I tuoi sogni</div>
      <div className="accordion">
        <Accordion title="🌙 Racconta un sogno a Luna" bare>
          <p style={{ fontSize: '15px', lineHeight: '1.7', marginBottom: '16px' }}>
            Hai fatto un sogno che ti è rimasto dentro? Raccontalo a Luna. Un&apos;interpretazione gratuita a settimana.
          </p>
          <Link
            href="/sogni"
            className="btn-line"
            style={{ display: 'inline-block', width: '100%', textAlign: 'center', fontSize: '15px', marginTop: '10px' }}
          >
            Interpreta un sogno →
          </Link>
        </Accordion>
      </div>

      <div className="section-label" style={{ marginTop: '30px', fontSize: '15px' }}>Compatibilità</div>
      <div className="accordion">
        <Accordion title="Scopri l'intesa con un'altra persona" bare>
          <Link href="/compatibilita" className="btn-line" style={{ display: 'inline-block', width: '100%', textAlign: 'center', fontSize: '15px', marginTop: '10px' }}>
            Vai alla compatibilità →
          </Link>
        </Accordion>
      </div>

      <div className="section-label" style={{ marginTop: '30px', fontSize: '15px' }}>Rimani connesso</div>
      <div className="accordion">
        <Accordion title="Collega Telegram" bare>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '10px 0' }}>
            {token && (
              <a
                href={`https://t.me/Luna2OroscopoBot?start=${token}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#2AABEE',
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(42, 171, 238, 0.3)'
                }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </a>
            )}
          </div>
        </Accordion>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
        <button 
          onClick={() => router.push('/consulenza')}
          className="cta" 
          style={{ flex: 1, fontSize: '15px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
          Prenota consulto
        </button>
        <button 
          onClick={() => router.push('/chat')}
          className="cta" 
          style={{ flex: 1, fontSize: '15px', padding: '14px', background: 'transparent', border: '1px solid var(--text-dim)', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Apri chat
        </button>
      </div>

      <div className="footer" style={{ fontSize: '12px' }}>
        <Link href="/privacy">Privacy</Link>·
        <Link href="/disclaimer">Disclaimer</Link>·
        <Link href="/faq">?</Link>
      </div>

    </div>
  );
}

export default function SalaPage() {
  return (
    <Suspense fallback={
      <div className="canvas">
        <div className="topbar">
          <div className="brand">✦ Luna Astrologica</div>
        </div>
        <p style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-dim)' }}>
          Caricamento...
        </p>
      </div>
    }>
      <SalaContent />
    </Suspense>
  );
}
