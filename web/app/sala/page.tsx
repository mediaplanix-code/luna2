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

function SalaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [settori, setSettori] = useState<any>(null);
  const [loadingSettori, setLoadingSettori] = useState(false);

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
  }, [token]);

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

  const soleSegno = planets.Sole?.segno || 'Ariete';
  const lunaSegno = planets.Luna?.segno || 'Ariete';
  const ascSegno = ascLon !== undefined ? lonToSign(ascLon) : '—';
  const mcSegno = data.chart.mc?.longitude !== undefined ? lonToSign(data.chart.mc.longitude) : '—';

  const compatibili = COMPATIBILI[soleSegno] || [];
  const transitiList = (data.transits?.aspects_to_natal || []).slice(0, 5);

  const oroscopoSettimanale = transitiList.length > 0
    ? `Questa settimana ${transitiList.map((t: any) => `${t.transito} in ${t.tipo} al tuo ${t.natale}`).slice(0, 2).join(', ')}.`
    : 'Nessun transito rilevante questa settimana.';

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

      <div className="section-label">Esplora i tuoi settori</div>
      <div className="accordion">
        <Accordion title="❤️ Amore e Relazioni" bare>
          <p style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '16px' }}>
            {loadingSettori ? 'Sto leggendo le stelle...' : (settori?.amore || '...')}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button className="icon-btn" title="Chat" onClick={() => router.push('/chat?focus=tema_amore')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </button>
            <button className="icon-btn accent" title="Voce" onClick={() => router.push('/consulenza?focus=tema_amore')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
            </button>
          </div>
        </Accordion>

        <Accordion title="💼 Carriera e Finanze" bare>
          <p style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '16px' }}>
            {loadingSettori ? 'Sto leggendo le stelle...' : (settori?.lavoro || '...')}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button className="icon-btn" title="Chat" onClick={() => router.push('/chat?focus=tema_lavoro')}>
              <svg viewBox="0 0 24 24" fill
