'use client';

import { useState } from 'react';
import Link from 'next/link';

const API_URL = "https://luna2-api.onrender.com";

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [clienti, setClienti] = useState<any[]>([]);
  const [autenticato, setAutenticato] = useState(false);
  const [errore, setErrore] = useState('');
  const [inCaricamento, setInCaricamento] = useState(false);

  const accedi = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrore('');
    setInCaricamento(true);
    try {
      const r = await fetch(`${API_URL}/admin/clienti?password=${encodeURIComponent(password)}`);
      if (r.status === 403) {
        setErrore('Password errata.');
        return;
      }
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Errore');
      setClienti(d.clienti || []);
      setAutenticato(true);
      localStorage.setItem('luna2_admin_password', password);
    } catch (err: any) {
      setErrore(err.message);
    } finally {
      setInCaricamento(false);
    }
  };

  const regalaMinuti = async (profile_id: string, minuti: number) => {
    try {
      const r = await fetch(`${API_URL}/admin/regala-minuti/${profile_id}?minuti=${minuti}&password=${encodeURIComponent(password)}`, { method: 'POST' });
      const d = await r.json();
      if (r.ok) {
        alert(d.message);
        const rl = await fetch(`${API_URL}/admin/clienti?password=${encodeURIComponent(password)}`);
        const dl = await rl.json();
        setClienti(dl.clienti || []);
      } else {
        alert('Errore: ' + d.detail);
      }
    } catch (e: any) {
      alert('Errore di connessione');
    }
  };

  if (!autenticato) {
    return (
      <div className="canvas">
        <div className="topbar"><Link href="/" className="back">← Home</Link><div className="brand">✦ tuFelia Admin</div></div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 400, textAlign: 'center', marginBottom: '22px' }}>Accesso Admin</h1>
        <form onSubmit={accedi}>
          <div className="field"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
          {errore && <div className="error" style={{ marginTop: '16px' }}>{errore}</div>}
          <button type="submit" disabled={inCaricamento} className="cta" style={{ marginTop: '24px', width: '100%' }}>{inCaricamento ? 'Verifica...' : 'Entra'}</button>
        </form>
      </div>
    );
  }

  // Calcolo statistiche
  const totale = clienti.length;
  const donne = clienti.filter(c => c.sesso === 'Donna').length;
  const uomini = clienti.filter(c => c.sesso === 'Uomo').length;
  const altri = clienti.filter(c => c.sesso !== 'Donna' && c.sesso !== 'Uomo').length;
  const conTelegram = clienti.filter(c => c.telegram_id).length;
  const conLibro = clienti.filter(c => c.libro !== 'nessuno').length;
  const marketingOk = clienti.filter(c => c.marketing_consent).length;
  
  const etaMedia = (() => {
    const conEta = clienti.filter(c => c.eta !== null);
    if (conEta.length === 0) return 'N/D';
    const somma = conEta.reduce((acc, c) => acc + c.eta, 0);
    return Math.round(somma / conEta.length) + ' anni';
  })();

  return (
    <div className="canvas">
      <div className="topbar"><Link href="/" className="back">← Home</Link><div className="brand">✦ tuFelia Admin</div></div>
      
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 400, textAlign: 'center', marginBottom: '22px' }}>Dashboard</h1>

      {/* DASHBOARD STATISTICHE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', color: '#F5A623', fontWeight: 'bold' }}>{totale}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Clienti Totali</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', color: '#F5A623', fontWeight: 'bold' }}>{conLibro}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Hanno il Libro</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', color: '#F5A623', fontWeight: 'bold' }}>{etaMedia}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Età Media</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#F5A623', fontWeight: 'bold' }}>♀ {donne} / ♂ {uomini} / ✦ {altri}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Sesso</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#F5A623', fontWeight: 'bold' }}>{conTelegram}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Su Telegram</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#F5A623', fontWeight: 'bold' }}>{marketingOk}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Marketing OK</div>
        </div>
      </div>

      {/* TABELLA CLIENTI */}
      <div className="section-label" style={{ fontSize: '15px', marginTop: '20px' }}>Elenco Clienti</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(245,166,35,0.1)' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>Nome</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '8px' }}>Sesso</th>
              <th style={{ padding: '8px' }}>Età</th>
              <th style={{ padding: '8px' }}>Credito</th>
              <th style={{ padding: '8px' }}>Libro</th>
              <th style={{ padding: '8px' }}>TG</th>
              <th style={{ padding: '8px' }}>Mkt</th>
              <th style={{ padding: '8px' }}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {clienti.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <td style={{ padding: '8px' }}>{c.nome}</td>
                <td style={{ padding: '8px', fontSize: '10px' }}>{c.email}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{c.sesso === 'Donna' ? '♀' : c.sesso === 'Uomo' ? '♂' : '✦'}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{c.eta ?? '-'}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{Math.floor(c.credito_secondi / 60)}m</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{c.libro === 'nessuno' ? '❌' : '✅'}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{c.telegram_id ? '✅' : '❌'}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{c.marketing_consent ? '✅' : '❌'}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  <button onClick={() => regalaMinuti(c.id, 15)} style={{ background: '#F5A623', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>+15m</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="footer" style={{ marginTop: '40px' }}>
        <Link href="/privacy">Privacy</Link>·<Link href="/disclaimer">Disclaimer</Link>·<Link href="/faq">FAQ</Link>
      </div>
    </div>
  );
}
