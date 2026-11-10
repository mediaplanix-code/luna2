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
  
  const [filtroSesso, setFiltroSesso] = useState('');
  const [filtroSegno, setFiltroSegno] = useState('');
  const [filtroMarketing, setFiltroMarketing] = useState('');
  const [ricercaTesto, setRicercaTesto] = useState('');
  
  const [minutiCustom, setMinutiCustom] = useState('');
  const [notaCustom, setNotaCustom] = useState('');

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

  const aggiornaLista = async () => {
    const rl = await fetch(`${API_URL}/admin/clienti?password=${encodeURIComponent(password)}`);
    const dl = await rl.json();
    setClienti(dl.clienti || []);
    if (clienteSelezionato) {
      const agg = dl.clienti.find((c: any) => c.id === clienteSelezionato.id);
      if (agg) setClienteSelezionato(agg);
    }
  };

  const regalaMinuti = async (profile_id: string, minuti: number) => {
    if (minuti <= 0) return;
    try {
      const r = await fetch(`${API_URL}/admin/regala-minuti/${profile_id}?minuti=${minuti}&password=${encodeURIComponent(password)}`, { method: 'POST' });
      const d = await r.json();
      if (r.ok) { alert(d.message); aggiornaLista(); } else { alert('Errore: ' + d.detail); }
    } catch { alert('Errore di connessione'); }
  };

  const salvaNota = async () => {
    if (!clienteSelezionato) return;
    try {
      const r = await fetch(`${API_URL}/admin/nota/${clienteSelezionato.id}?nota=${encodeURIComponent(notaCustom)}&password=${encodeURIComponent(password)}`, { method: 'POST' });
      if (r.ok) { alert('Nota salvata'); aggiornaLista(); } else { alert('Errore'); }
    } catch { alert('Errore di connessione'); }
  };

  const generaLibroManuale = async () => {
    if (!clienteSelezionato) return;
    if (!confirm('Vuoi generare e inviare il libro manualmente per questo cliente?')) return;
    try {
      const r = await fetch(`${API_URL}/admin/genera-libro/${clienteSelezionato.id}?password=${encodeURIComponent(password)}`, { method: 'POST' });
      const d = await r.json();
      if (r.ok) { alert(d.message); aggiornaLista(); } else { alert('Errore: ' + d.detail); }
    } catch { alert('Errore di connessione'); }
  };

  const clientiFiltrati = useMemo(() => {
    return clienti.filter(c => {
      if (filtroSesso && c.sesso !== filtroSesso) return false;
      if (filtroSegno && c.segno !== filtroSegno) return false;
      if (filtroMarketing === 'si' && !c.marketing_consent) return false;
      if (filtroMarketing === 'no' && c.marketing_consent) return false;
      if (ricercaTesto) {
        const t = ricercaTesto.toLowerCase();
        if (!c.nome?.toLowerCase().includes(t) && !c.email?.toLowerCase().includes(t) && !c.citta?.toLowerCase().includes(t)) return false;
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
          <button type="submit" disabled={inCaricamento} style={{ width: '100%', padding: '12px', background: '#F5A623', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>{inCaricamento ? 'Verifica...' : 'Accedi'}</button>
        </form>
      </div>
    );
  }

  const totale = clientiFiltrati.length;
  const tuttiISegni = Array.from(new Set(clienti.map(c => c.segno).filter(Boolean))).sort();

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      <div style={{ width: '220px', background: '#111', borderRight: '1px solid #222', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ color: '#F5A623', fontSize: '18px', marginBottom: '30px' }}>tuFelia CRM</h1>
        <div style={{ marginBottom: '20px' }}><div style={{ fontSize: '11px', color: '#666' }}>CLIENTI</div><div style={{ fontSize: '24px', fontWeight: 'bold' }}>{totale}</div></div>
        <div style={{ marginTop: 'auto' }}><Link href="/" style={{ color: '#666', fontSize: '12px' }}>← Torna al sito</Link></div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid #222', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input type="text" placeholder="Cerca..." value={ricercaTesto} onChange={e => setRicercaTesto(e.target.value)} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #444', background: '#222', color: '#fff', flex: '1', minWidth: '150px' }} />
          <select value={filtroSesso} onChange={e => setFiltroSesso(e.target.value)} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #444', background: '#222', color: '#fff' }}><option value="">Tutti i sessi</option><option value="Donna">Donna</option><option value="Uomo">Uomo</option><option value="Altro">Altro</option></select>
          <select value={filtroSegno} onChange={e => setFiltroSegno(e.target.value)} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #444', background: '#222', color: '#fff' }}><option value="">Tutti i segni</option>{tuttiISegni.map(s => <option key={s} value={s}>{s}</option>)}</select>
          <select value={filtroMarketing} onChange={e => setFiltroMarketing(e.target.value)} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #444', background: '#222', color: '#fff' }}><option value="">Marketing</option><option value="si">Consenso Sì</option><option value="no">Consenso No</option></select>
          <button onClick={() => { setFiltroSesso(''); setFiltroSegno(''); setFiltroMarketing(''); setRicercaTesto(''); }} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid #444', color: '#888', borderRadius: '5px', cursor: 'pointer' }}>Reset</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead style={{ background: '#111', position: 'sticky', top: 0 }}>
              <tr>
                <th style={{ padding: '10px', textAlign: 'left', color: '#666' }}>NOME</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#666' }}>DATA ISCRIZIONE</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#666' }}>SESSO</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#666' }}>ETÀ</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#666' }}>SEGNO</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#666' }}>CREDITO</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#666' }}>MARKETING</th>
              </tr>
            </thead>
            <tbody>
              {clientiFiltrati.map(c => (
                <tr key={c.id} onClick={() => { setClienteSelezionato(c); setNotaCustom(c.note || ''); }} style={{ borderBottom: '1px solid #1a1a1a', cursor: 'pointer', background: clienteSelezionato?.id === c.id ? '#1a1a1a' : 'transparent' }}>
                  <td style={{ padding: '10px' }}>{c.nome}</td>
                  <td style={{ padding: '10px', color: '#888' }}>{new Date(c.created_at).toLocaleDateString('it-IT')}</td>
                  <td style={{ padding: '10px' }}>{c.sesso}</td>
                  <td style={{ padding: '10px' }}>{c.eta ?? '-'}</td>
                  <td style={{ padding: '10px' }}>{c.segno || '-'}</td>
                  <td style={{ padding: '10px' }}>{Math.floor(c.credito_secondi / 60)}m</td>
                  <td style={{ padding: '10px' }}>{c.marketing_consent ? 'Sì' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALE DETTAGLIO CLIENTE */}
      {clienteSelezionato && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#111', width: '90%', maxWidth: '900px', height: '80vh', borderRadius: '10px', border: '1px solid #333', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Header Modale */}
            <div style={{ padding: '20px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', color: '#F5A623' }}>Scheda Cliente: {clienteSelezionato.nome}</h2>
              <button onClick={() => setClienteSelezionato(null)} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>

            {/* Corpo Modale */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              
              {/* Colonna Sinistra: Dati */}
              <div style={{ width: '40%', padding: '20px', borderRight: '1px solid #222', overflowY: 'auto' }}>
                <div style={{ marginBottom: '15px' }}><div style={{ fontSize: '11px', color: '#666' }}>EMAIL</div><div style={{ fontSize: '14px', wordBreak: 'break-all' }}>{clienteSelezionato.email}</div></div>
                <div style={{ marginBottom: '15px' }}><div style={{ fontSize: '11px', color: '#666' }}>TELEFONO</div><div style={{ fontSize: '14px' }}>{clienteSelezionato.telefono || 'N/D'}</div></div>
                <div style={{ marginBottom: '15px' }}><div style={{ fontSize: '11px', color: '#666' }}>DATA DI NASCITA</div><div style={{ fontSize: '14px' }}>{clienteSelezionato.data_nascita || 'N/D'}</div></div>
                <div style={{ marginBottom: '15px' }}><div style={{ fontSize: '11px', color: '#666' }}>SEGNO</div><div style={{ fontSize: '14px' }}>{clienteSelezionato.segno || 'N/D'}</div></div>
                <div style={{ marginBottom: '15px' }}><div style={{ fontSize: '11px', color: '#666' }}>CITTÀ</div><div style={{ fontSize: '14px' }}>{clienteSelezionato.citta || 'N/D'}</div></div>
                <div style={{ marginBottom: '15px' }}><div style={{ fontSize: '11px', color: '#666' }}>ISCRITTO IL</div><div style={{ fontSize: '14px' }}>{new Date(clienteSelezionato.created_at).toLocaleDateString('it-IT')}</div></div>
                <div style={{ marginBottom: '15px' }}><div style={{ fontSize: '11px', color: '#666' }}>CREDITO</div><div style={{ fontSize: '18px', color: '#06D6A0' }}>{Math.floor(clienteSelezionato.credito_secondi / 60)} minuti</div></div>
                <div style={{ marginBottom: '15px' }}><div style={{ fontSize: '11px', color: '#666' }}>MARKETING</div><div>{clienteSelezionato.marketing_consent ? 'Consenso dato' : 'Nessun consenso'}</div></div>
              </div>

              {/* Colonna Destra: Note e Azioni */}
              <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                
                <div style={{ marginBottom: '10px', fontSize: '13px', color: '#F5A623', fontWeight: 'bold' }}>NOTE SUL CLIENTE</div>
                <textarea 
                  value={notaCustom} 
                  onChange={e => setNotaCustom(e.target.value)} 
                  style={{ width: '100%', flex: 1, minHeight: '150px', padding: '15px', borderRadius: '5px', border: '1px solid #444', background: '#222', color: '#fff', fontSize: '14px', lineHeight: '1.5', resize: 'none', marginBottom: '10px' }} 
                  placeholder="Scrivi qui appunti, richieste del cliente, ecc..."
                />
                <button onClick={salvaNota} style={{ background: '#444', color: '#fff', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer', fontSize: '13px', marginBottom: '20px', alignSelf: 'flex-start' }}>Salva Note</button>

                <hr style={{ borderColor: '#222', margin: '10px 0' }} />

                <div style={{ marginBottom: '10px', fontSize: '13px', color: '#F5A623', fontWeight: 'bold' }}>REGALA MINUTI</div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <input type="number" placeholder="Minuti" value={minutiCustom} onChange={e => setMinutiCustom(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #444', background: '#222', color: '#fff', fontSize: '14px' }} />
                  <button onClick={() => { regalaMinuti(clienteSelezionato.id, parseInt(minutiCustom)); setMinutiCustom(''); }} style={{ background: '#F5A623', border: 'none', padding: '10px 20px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', color: '#000', fontSize: '14px' }}>Regala</button>
                </div>

                <hr style={{ borderColor: '#222', margin: '10px 0' }} />

                <div style={{ marginBottom: '10px', fontSize: '13px', color: '#F5A623', fontWeight: 'bold' }}>AZIONI</div>
                <button onClick={generaLibroManuale} style={{ background: 'transparent', border: '1px solid #F5A623', color: '#F5A623', padding: '10px', borderRadius: '5px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>Genera/Invia Libro</button>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
