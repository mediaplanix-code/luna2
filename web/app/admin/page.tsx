'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

const API_URL = "https://luna2-api.onrender.com";

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [clienti, setClienti] = useState<any[]>([]);
  const [autenticato, setAutenticato] = useState(false);
  const [errore, setErrore] = useState('');
  const [inCaricamento, setInCaricamento] = useState(false);
  const [clienteSelezionato, setClienteSelezionato] = useState<any>(null);
  
  // Stati per i filtri
  const [filtroSesso, setFiltroSesso] = useState('');
  const [filtroSegno, setFiltroSegno] = useState('');
  const [filtroMarketing, setFiltroMarketing] = useState('');
  const [ricercaTesto, setRicercaTesto] = useState('');
  
  // Stato per regalare minuti custom
  const [minutiCustom, setMinutiCustom] = useState('');

  const accedi = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrore('');
    setInCaricamento(true);
    try {
      const r = await fetch(`${API_URL}/admin/clienti?password=${encodeURIComponent(password)}`);
      if (r.status === 403) { setErrore('Password errata.'); return; }
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Errore');
      setClienti(d.clienti || []);
      setAutenticato(true);
      localStorage.setItem('luna2_admin_password', password);
    } catch (err: any) { setErrore(err.message); }
    finally { setInCaricamento(false); }
  };

  const regalaMinuti = async (profile_id: string, minuti: number) => {
    if (minuti <= 0) return;
    try {
      const r = await fetch(`${API_URL}/admin/regala-minuti/${profile_id}?minuti=${minuti}&password=${encodeURIComponent(password)}`, { method: 'POST' });
      const d = await r.json();
      if (r.ok) {
        alert(d.message);
        const rl = await fetch(`${API_URL}/admin/clienti?password=${encodeURIComponent(password)}`);
        const dl = await rl.json();
        setClienti(dl.clienti || []);
        const aggiornato = dl.clienti.find((c: any) => c.id === profile_id);
        if (aggiornato) setClienteSelezionato(aggiornato);
      } else { alert('Errore: ' + d.detail); }
    } catch { alert('Errore di connessione'); }
  };

  // Filtri e ricerca
  const clientiFiltrati = useMemo(() => {
    return clienti.filter(c => {
      if (filtroSesso && c.sesso !== filtroSesso) return false;
      if (filtroSegno && c.segno !== filtroSegno) return false;
      if (filtroMarketing === 'si' && !c.marketing_consent) return false;
      if (filtroMarketing === 'no' && c.marketing_consent) return false;
      if (ricercaTesto) {
        const t = ricercaTesto.toLowerCase();
        if (!c.nome?.toLowerCase().includes(t) && !c.email?.toLowerCase().includes(t) && !c.citta?.toLowerCase().includes(t)) {
          return false;
        }
      }
      return true;
    });
  }, [clienti, filtroSesso, filtroSegno, filtroMarketing, ricercaTesto]);

  if (!autenticato) {
    return (
      <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={accedi} style={{ background: '#1a1a1a', padding: '40px', borderRadius: '10px', width: '350px', border: '1px solid #333' }}>
          <h1 style={{ color: '#fff', fontSize: '20px', marginBottom: '20px', textAlign: 'center' }}>tuFelia CRM</h1>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '5px', border: '1px solid #444', background: '#222', color: '#fff' }} />
          {errore && <p style={{ color: 'red', fontSize: '12px', marginBottom: '10px' }}>{errore}</p>}
          <button type="submit" disabled={inCaricamento} style={{ width: '100%', padding: '12px', background: '#F5A623', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
            {inCaricamento ? 'Verifica...' : 'Accedi'}
          </button>
        </form>
      </div>
    );
  }

  const totale = clientiFiltrati.length;
  const donne = clientiFiltrati.filter(c => c.sesso === 'Donna').length;
  const uomini = clientiFiltrati.filter(c => c.sesso === 'Uomo').length;
  const incassoTotale = clientiFiltrati.reduce((acc, c) => acc + (c.importo_totale || 0), 0);
  const tuttiISegni = Array.from(new Set(clienti.map(c => c.segno).filter(Boolean))).sort();

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* SIDEBAR */}
      <div style={{ width: '220px', background: '#111', borderRight: '1px solid #222', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ color: '#F5A623', fontSize: '18px', marginBottom: '30px' }}>tuFelia CRM</h1>
        
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: '#666' }}>CLIENTI (FILTRATI)</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{totale}</div>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: '#666' }}>SESSO</div>
          <div style={{ fontSize: '14px' }}>Donne: {donne} · Uomini: {uomini}</div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: '#666' }}>INCASSO TOTALE</div>
          <div style={{ fontSize: '20px', color: '#06D6A0' }}>€ {incassoTotale.toFixed(2)}</div>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <Link href="/" style={{ color: '#666', fontSize: '12px' }}>← Torna al sito</Link>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* FILTRI */}
        <div style={{ padding: '15px 20px', borderBottom: '1px solid #222', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Cerca nome, email, città..." 
            value={ricercaTesto} 
            onChange={e => setRicercaTesto(e.target.value)}
            style={{ padding: '8px', borderRadius: '5px', border: '1px solid #444', background: '#222', color: '#fff', flex: '1', minWidth: '200px' }}
          />
          <select value={filtroSesso} onChange={e => setFiltroSesso(e.target.value)} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #444', background: '#222', color: '#fff' }}>
            <option value="">Tutti i sessi</option>
            <option value="Donna">Donna</option>
            <option value="Uomo">Uomo</option>
            <option value="Altro">Altro</option>
          </select>
          <select value={filtroSegno} onChange={e => setFiltroSegno(e.target.value)} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #444', background: '#222', color: '#fff' }}>
            <option value="">Tutti i segni</option>
            {tuttiISegni.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filtroMarketing} onChange={e => setFiltroMarketing(e.target.value)} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #444', background: '#222', color: '#fff' }}>
            <option value="">Marketing (tutti)</option>
            <option value="si">Solo con consenso</option>
            <option value="no">Solo senza consenso</option>
          </select>
          <button onClick={() => { setFiltroSesso(''); setFiltroSegno(''); setFiltroMarketing(''); setRicercaTesto(''); }} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid #444', color: '#888', borderRadius: '5px', cursor: 'pointer' }}>Reset</button>
        </div>

        {/* TABELLA */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead style={{ background: '#111', position: 'sticky', top: 0 }}>
              <tr>
                <th style={{ padding: '10px', textAlign: 'left', color: '#666' }}>NOME</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#666' }}>EMAIL</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#666' }}>SESSO</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#666' }}>ETÀ</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#666' }}>SEGNO</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#666' }}>CREDITO</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#666' }}>SPESO</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#666' }}>MARKETING</th>
              </tr>
            </thead>
            <tbody>
              {clientiFiltrati.map(c => (
                <tr key={c.id} onClick={() => setClienteSelezionato(c)} style={{ borderBottom: '1px solid #1a1a1a', cursor: 'pointer', background: clienteSelezionato?.id === c.id ? '#1a1a1a' : 'transparent' }}>
                  <td style={{ padding: '10px' }}>{c.nome}</td>
                  <td style={{ padding: '10px', color: '#888' }}>{c.email}</td>
                  <td style={{ padding: '10px' }}>{c.sesso}</td>
                  <td style={{ padding: '10px' }}>{c.eta ?? '-'}</td>
                  <td style={{ padding: '10px' }}>{c.segno || '-'}</td>
                  <td style={{ padding: '10px' }}>{Math.floor(c.credito_secondi / 60)} min</td>
                  <td style={{ padding: '10px', color: c.importo_totale > 0 ? '#06D6A0' : '#666' }}>€ {(c.importo_totale || 0).toFixed(2)}</td>
                  <td style={{ padding: '10px' }}>{c.marketing_consent ? 'Sì' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PANNELLO DETTAGLIO */}
      {clienteSelezionato && (
        <div style={{ width: '320px', background: '#111', borderLeft: '1px solid #222', padding: '20px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', color: '#F5A623' }}>Scheda Cliente</h3>
            <button onClick={() => setClienteSelezionato(null)} style={{ background: 'transparent', border: 'none', color: '#666', fontSize: '22px', cursor: 'pointer' }}>×</button>
          </div>
          
          <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '10px', color: '#666' }}>NOME</div><div style={{ fontSize: '14px' }}>{clienteSelezionato.nome}</div></div>
          <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '10px', color: '#666' }}>EMAIL</div><div style={{ fontSize: '12px', wordBreak: 'break-all' }}>{clienteSelezionato.email}</div></div>
          <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '10px', color: '#666' }}>TELEFONO</div><div style={{ fontSize: '12px' }}>{clienteSelezionato.telefono || 'Non fornito'}</div></div>
          <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '10px', color: '#666' }}>DATA DI NASCITA</div><div style={{ fontSize: '12px' }}>{clienteSelezionato.data_nascita || 'Non fornita'}</div></div>
          <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '10px', color: '#666' }}>SEGNO</div><div style={{ fontSize: '12px' }}>{clienteSelezionato.segno || 'Non calcolato'}</div></div>
          <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '10px', color: '#666' }}>CITTÀ</div><div style={{ fontSize: '12px' }}>{clienteSelezionato.citta || 'Non fornita'}</div></div>
          <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '10px', color: '#666' }}>CREDITO</div><div style={{ fontSize: '18px', color: '#06D6A0' }}>{Math.floor(clienteSelezionato.credito_secondi / 60)} minuti</div></div>
          <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '10px', color: '#666' }}>SPESO TOTALE</div><div style={{ fontSize: '16px', color: '#F5A623' }}>€ {(clienteSelezionato.importo_totale || 0).toFixed(2)}</div></div>
          <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '10px', color: '#666' }}>TELEGRAM</div><div>{clienteSelezionato.telegram_id ? 'Collegato' : 'Non collegato'}</div></div>
          <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '10px', color: '#666' }}>LIBRO</div><div>{clienteSelezionato.libro === 'nessuno' ? 'Non acquistato' : 'Acquistato'}</div></div>
          <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '10px', color: '#666' }}>MARKETING</div><div>{clienteSelezionato.marketing_consent ? 'Consenso dato' : 'Nessun consenso'}</div></div>

          <hr style={{ borderColor: '#222', margin: '15px 0' }} />
          
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>REGALA MINUTI</div>
          <div style={{ display: 'flex', gap: '5px' }}>
            <input 
              type="number" 
              placeholder="Minuti" 
              value={minutiCustom} 
              onChange={e => setMinutiCustom(e.target.value)}
              style={{ flex: 1, padding: '8px', borderRadius: '5px', border: '1px solid #444', background: '#222', color: '#fff' }}
            />
            <button 
              onClick={() => { regalaMinuti(clienteSelezionato.id, parseInt(minutiCustom)); setMinutiCustom(''); }}
              style={{ background: '#F5A623', border: 'none', padding: '8px 15px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', color: '#000' }}
            >
              Regala
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
