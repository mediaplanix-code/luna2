'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Accordion from '../components/Accordion';

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

export default function SalaPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('luna2_token');
    if (!token) {
      router.push('/form');
      return;
    }
    fetch(`https://luna2-api.onrender.com/sala/${token}`)
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
  }, [router]);

  if (status === 'loading') {
    return (
      <div className="canvas">
        <div className="topbar">
          <div className="brand">✦ Luna Astrologica</div>
        </div>
        <p style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-dim)' }}>
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
  const mcLon = data.chart.mc?.longitude;

  const soleLon = planets.Sole?.longitude || 0;
  const lunaLon = planets.Luna?.longitude || 0;
  const soleSegno = planets.Sole?.segno || 'Ariete';
  const lunaSegno = planets.Luna?.segno || 'Ariete';
  const ascSegno = ascLon !== undefined ? lonToSign(ascLon) : '—';
  const mcSegno = mcLon !== undefined ? lonToSign(mcLon) : '—';

  const compatibili = COMPATIBILI[soleSegno] || [];
  const transitiList = (data.transits?.aspects_to_natal || []).slice(0, 5);

  return (
    <div className="canvas">

      <div className="topbar">
        <div className="brand">✦ Luna Astrologica</div>
        <div className="user">{nome} ▾</div>
      </div>

      <div className="sign-hero">
        <div className="sign-symbol">{SIMBOLI[soleSegno]}</div>
        <div className="sign-name">{soleSegno}</div>
        <div className="greeting">
          <h1>Ciao {nome}.</h1>
          <p>Ecco il tuo cielo oggi.</p>
        </div>
      </div>

      <div className="section-label">Il tuo identikit</div>
      <div className="identikit">
        <div className="row">
          <span className="label">Segno solare</span>
          <span className="value"><span className="sym">{SIMBOLI[soleSegno]}</span> {soleSegno}</span>
        </div>
        <div className="row">
          <span className="label">Ascendente</span>
          <span className="value"><span className="sym">{SIMBOLI[ascSegno] || '✦'}</span> {ascSegno}</span>
        </div>
        <div className="row">
          <span className="label">Luna</span>
          <span className="value"><span className="sym">{SIMBOLI[lunaSegno]}</span> {lunaSegno}</span>
        </div>
        <div className="row">
          <span className="label">Medio Cielo</span>
          <span className="value"><span className="sym">{SIMBOLI[mcSegno] || '✦'}</span> {mcSegno}</span>
        </div>
      </div>

      <div className="section-label">Segni compatibili</div>
      <div className="compat">
        {compatibili.slice(0, 3).map((s, i) => (
          <span key={s}>
            {i > 0 && <span className="dot">·</span>}
            {SIMBOLI[s]} {s}
          </span>
        ))}
        <br />
        {compatibili.slice(3).map((s, i) => (
          <span key={s}>
            {i > 0 && <span className="dot">·</span>}
            {SIMBOLI[s]} {s}
          </span>
        ))}
      </div>

      <div className="section-label">La tua ruota zodiacale</div>
      <div className="wheel-wrap">
        <div className="wheel"></div>
      </div>

      <div className="section-label">I tuoi dati</div>
      <div className="accordion">

        <Accordion title="Pianeti">
          <table className="data">
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
          <div className="what">Cosa vuol dire?</div>
          <div className="icon-row">
            <button className="icon-btn" title="Chat" onClick={() => router.push('/chat')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
            <button className="icon-btn accent" title="Voce" onClick={() => router.push('/consulenza')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
          </div>
          <div className="price"><strong>€19</strong> · 15 min</div>
        </Accordion>

        <Accordion title="Case">
          <table className="data">
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
          <div className="what">Cosa vuol dire?</div>
          <div className="icon-row">
            <button className="icon-btn" title="Chat" onClick={() => router.push('/chat')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
            <button className="icon-btn accent" title="Voce" onClick={() => router.push('/consulenza')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
          </div>
          <div className="price"><strong>€19</strong> · 15 min</div>
        </Accordion>

        <Accordion title="Aspetti">
          <table className="data">
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
          <div className="what">Cosa vuol dire?</div>
          <div className="icon-row">
            <button className="icon-btn" title="Chat" onClick={() => router.push('/chat')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
            <button className="icon-btn accent" title="Voce" onClick={() => router.push('/consulenza')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
          </div>
          <div className="price"><strong>€19</strong> · 15 min</div>
        </Accordion>

        <Accordion title="Transiti">
          <table className="data">
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
          <div className="what">Cosa vuol dire?</div>
          <div className="icon-row">
            <button className="icon-btn" title="Chat" onClick={() => router.push('/chat')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
            <button className="icon-btn accent" title="Voce" onClick={() => router.push('/consulenza')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
          </div>
          <div className="price"><strong>€19</strong> · 15 min</div>
        </Accordion>

      </div>

      <div className="section-label">Confronto con un&apos;altra persona</div>
      <div className="confronto">
        <div className="info">2 confronti gratuiti · poi su prenotazione</div>
        <Link href="/compatibilita" className="btn-line">Compatibilità</Link>
      </div>

      <button className="cta-voice" onClick={() => router.push('/consulenza')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
        <div className="text">
          <div className="title">Prenota il tuo consulto</div>
          <div className="desc">15 minuti · €19</div>
        </div>
      </button>

      <button className="cta-chat" onClick={() => router.push('/chat')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <div className="text">
          <div className="title">Apri la chat</div>
          <div className="desc">
            Hai {data.profile.chat_questions_limit - data.profile.chat_questions_used} domande disponibili
          </div>
        </div>
      </button>

      <div className="footer">
        <Link href="/privacy">Privacy</Link>·
        <Link href="/disclaimer">Disclaimer</Link>·
        <Link href="/faq">?</Link>
      </div>

    </div>
  );
}
