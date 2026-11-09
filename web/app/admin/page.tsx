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
      const r = await fetch(`${API_URL}/admin/regala-minuti/${profile_id}?minuti=${minuti}&password=${encodeURIComponent(password)}`, {
        method: 'POST',
      });
      const d = await r.json();
      if (r.ok) {
        alert(d.message);
        // Ricarichiamo la lista
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
        <div className="topbar">
          <Link href="/" className="back">← Home</Link>
          <div className="brand">✦ tuFelia Admin</div>
        </div>

        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 400, textAlign: 'center', marginBottom: '22px' }}>
          Accesso Admin
        </h1>

        <form onSubmit={accedi}>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {errore && <div className="error" style={{ marginTop: '16px' }}>{errore}</div>}
          <button type="submit" disabled={inCaricamento} className="cta" style={{ marginTop: '24px', width: '100%' }}>
            {inCaricamento ? 'Verifica...' : 'Entra'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="canvas">
      <div className="topbar">
        <Link href="/" className="back">← Home</Link>
        <div className="brand">✦ tuFelia Admin</div>
      </div>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 400, textAlign: 'center', marginBottom: '22px' }}>
        I tuoi clienti ({clienti.length})
      </h1>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(245,166,35,0.1)' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>Nome</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '8px' }}>Credito</th>
              <th style={{ padding: '8px' }}>Libro</th>
              <th style={{ padding: '8px' }}>Telegram</th>
              <th style={{ padding: '8px' }}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {clienti.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <td style={{ padding: '8px' }}>{c.nome}</td>
                <td style={{ padding: '8px', fontSize: '10px' }}>{c.email}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{Math.floor(c.credito_secondi / 60)}m</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{c.libro}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{c.telegram_id ? '✅' : '❌'}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  <button onClick={() => regalaMinuti(c.id, 15)} style={{ background: '#F5A623', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', marginRight: '4px' }}>
                    +15m
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="footer" style={{ marginTop: '40px' }}>
        <Link href="/privacy">Privacy</Link>·
        <Link href="/disclaimer">Disclaimer</Link>·
        <Link href="/faq">FAQ</Link>
      </div>
    </div>
  );
}
