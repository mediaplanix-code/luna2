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
  const [clienteSelezionato, setClienteSelezionato] = useState<any>(null);

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
        if (clienteSelezionato && clienteSelezionato.id === profile_id) {
          const aggiornato = dl.clienti.find((c: any) => c.id === profile_id);
          setClienteSelezionato(aggiornato);
        }
      } else {
        alert('Errore: ' + d.detail);
      }
    } catch (e: any) {
      alert('Errore di connessione');
    }
  };

  if (!autenticato) {
    return (
      <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={accedi} style={{ background: '#1a1a1a', padding: '40px', borderRadius: '10px', width: '350px', border: '1px solid #333' }}>
          <h1 style={{ color: '#fff', fontSize: '20px', marginBottom: '20px', textAlign: 'center' }}>Admin Panel</h1>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #444', background: '#222', color: '#fff' }} />
          {errore && <p style={{ color: 'red', fontSize: '12px', marginBottom: '10px' }}>{errore}</p>}
          <button type="submit" disabled={inCaricamento} style={{ width: '100%', padding: '12px', background: '#F5A623', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
            {inCaricamento ? 'Verifica...' : 'Accedi'}
          </button>
        </form>
      </div>
    );
  }

  // Calcolo statistiche
  const totale = clienti.length;
  const donne = clienti.filter(c => c.sesso === 'Donna').length;
  const uomini = clienti.filter(c => c.sesso === 'Uomo').length;
  const conTelegram = clienti.filter(c => c.telegram_id).length;
  const conLibro = clienti.filter(c => c.libro !== 'nessuno').length;
  const marketingOk = clienti.filter(c => c.marketing_consent).length;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* SIDEBAR */}
      <div style={{ width: '250px', background: '#111', borderRight: '1px solid #222', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ color: '#F5A623', fontSize: '20px', marginBottom: '30px' }}>✦ tuFelia CRM</h1>
        
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>CLIENTI TOTALI</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{totale}</div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>SESSO</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span>♀ {donne}</span>
            <span>♂ {uomini}</span>
            <span>✦ {totale - donne - uomini}</span>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>LIBRI VENDUTI</div>
          <div style={{ fontSize: '20px' }}>{conLibro}</div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>SU TELEGRAM</div>
          <div style={{ fontSize: '20px' }}>{conTelegram}</div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>MARKETING OK</div>
          <div style={{ fontSize: '20px' }}>{marketingOk}</div>
        </div>

        <div style={{ marginTop: 'auto', fontSize: '12px', color: '#444' }}>
          <Link href="/" style={{ color: '#666' }}>← Torna al sito</Link>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* HEADER */}
        <div style={{ padding: '20px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px' }}>Elenco Clienti</h2>
          <button onClick={() => { setAutenticato(false); setClienti([]); }} style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: '5px 15px', borderRadius: '5px', cursor: 'pointer' }}>Esci</button>
        </div>

        {/* TABLE */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ background: '#111', position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', color: '#666', fontWeight: 'normal' }}>NOME</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#666', fontWeight: 'normal' }}>EMAIL</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#666', fontWeight: 'normal' }}>SESSO</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#666', fontWeight: 'normal' }}>ETÀ</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#666', fontWeight: 'normal' }}>CREDITO</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#666', fontWeight: 'normal' }}>LIBRO</th>
              </tr>
            </thead>
            <tbody>
              {clienti.map(c => (
                <tr 
                  key={c.id} 
                  onClick={() => setClienteSelezionato(c)}
                  style={{ borderBottom: '1px solid #1a1a1a', cursor: 'pointer', background: clienteSelezionato?.id === c.id ? '#1a1a1a' : 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#151515')}
                  onMouseLeave={e => (e.currentTarget.style.background = clienteSelezionato?.id === c.id ? '#1a1a1a' : 'transparent')}
                >
                  <td style={{ padding: '12px' }}>{c.nome}</td>
                  <td style={{ padding: '12px', color: '#888' }}>{c.email}</td>
                  <td style={{ padding: '12px' }}>{c.sesso === 'Donna' ? '♀' : c.sesso === 'Uomo' ? '♂' : '✦'}</td>
                  <td style={{ padding: '12px' }}>{c.eta ?? '-'}</td>
                  <td style={{ padding: '12px' }}>{Math.floor(c.credito_secondi / 60)} min</td>
                  <td style={{ padding: '12px' }}>{c.libro === 'nessuno' ? '❌' : '✅'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PANNELLO DETTAGLIO CLIENTE */}
      {clienteSelezionato && (
        <div style={{ width: '350px', background: '#111', borderLeft: '1px solid #222', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', color: '#F5A623' }}>Dettaglio Cliente</h3>
            <button onClick={() => setClienteSelezionato(null)} style={{ background: 'transparent', border: 'none', color: '#666', fontSize: '20px', cursor: 'pointer' }}>×</button>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <div style={{ fontSize: '11px', color: '#666' }}>NOME</div>
            <div style={{ fontSize: '15px' }}>{clienteSelezionato.nome}</div>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <div style={{ fontSize: '11px', color: '#666' }}>EMAIL</div>
            <div style={{ fontSize: '13px', wordBreak: 'break-all' }}>{clienteSelezionato.email}</div>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <div style={{ fontSize: '11px', color: '#666' }}>TELEFONO</div>
            <div style={{ fontSize: '13px' }}>{clienteSelezionato.telefono || 'Non fornito'}</div>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <div style={{ fontSize: '11px', color: '#666' }}>CREDITO</div>
            <div style={{ fontSize: '20px', color: '#06D6A0' }}>{Math.floor(clienteSelezionato.credito_secondi / 60)} minuti</div>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <div style={{ fontSize: '11px', color: '#666' }}>TELEGRAM</div>
            <div>{clienteSelezionato.telegram_id ? 'Collegato ✅' : 'Non collegato ❌'}</div>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <div style={{ fontSize: '11px', color: '#666' }}>LIBRO</div>
            <div>{clienteSelezionato.libro === 'nessuno' ? 'Non acquistato' : clienteSelezionato.libro}</div>
          </div>

          <hr style={{ borderColor: '#222', margin: '20px 0' }} />

          <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>AZIONI RAPIDE</div>
          <button onClick={() => regalaMinuti(clienteSelezionato.id, 15)} style={{ background: '#F5A623', border: 'none', padding: '10px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' }}>
            + 15 Minuti
          </button>
          <button onClick={() => regalaMinuti(clienteSelezionato.id, 30)} style={{ background: 'transparent', border: '1px solid #F5A623', color: '#F5A623', padding: '10px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
            + 30 Minuti
          </button>
        </div>
      )}
    </div>
  );
}
