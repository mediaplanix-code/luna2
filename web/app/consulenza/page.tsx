'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_fZu14pfFefK76BRgk8e3e00";
const API_URL = "https://luna2-api.onrender.com";

function ConsulenzaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focus = searchParams.get('focus') || 'generico';
  const pagato = searchParams.get('pagato');

  const [nome, setNome] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [credito, setCredito] = useState(0);
  const [inCaricamento, setInCaricamento] = useState(true);
  const [errore, setErrore] = useState('');
  const [confermato, setConfermato] = useState(false);

  useEffect(() => {
    const n = localStorage.getItem('luna2_nome');
    if (n) setNome(n);
    const t = localStorage.getItem('luna2_token');
    if (!t) { router.push('/form'); return; }
    setToken(t);

    // Carica il widget di Dograh in modo dinamico, passando il token
    const scriptId = 'dograh-widget';
    if (!document.getElementById(scriptId)) {
      const js = document.createElement('script');
      js.id = scriptId;
      js.src = 'https://app.dograh.com/embed/dograh-widget.js?token=emb_UQOedLcs2MzOyEVqATylvrf_9HCxGPcDsMVd9RKLiCY&environment=production&apiEndpoint=https://api.dograh.com';
      
      // Passiamo il token del cliente e altre info nel contesto
      js.setAttribute('data-dograh-context', JSON.stringify({
        page_url: window.location.href,
        today: new Date().toISOString().slice(0, 10),
        cliente_token: t  // <-- Il token per identificare il cliente
      }));
      
      js.async = true;
      document.body.appendChild(js);
    }
  }, [router]);

  useEffect(() => {
    if (!token) return;
    if (pagato === '1' && !confermato) {
      setConfermato(true);
      fetch(`${API_URL}/conferma-pagamento/${token}`, { method: 'POST' })
        .then(r => r.json())
        .then(d => { if (d.status === 'ok') setCredito(d.credito_secondi); else setErrore('Pagamento ricevuto ma errore di attivazione.'); })
        .catch(() => setErrore('Pagamento ricevuto ma errore di connessione.'));
    }
  }, [token, pagato, confermato]);

  useEffect(() => {
    if (!token) return;
    const controlla = () => {
      fetch(`${API_URL}/stato-credito/${token}`)
        .then(r => r.json())
        .then(d => { setCredito(d.credito_secondi || 0); setInCaricamento(false); })
        .catch(() => setInCaricamento(false));
    };
    controlla();
    const id = setInterval(controlla, 15000);
    return () => clearInterval(id);
  }, [token]);

  const vaiAlPagamento = () => { window.location.href = STRIPE_PAYMENT_LINK; };

  if (inCaricamento) {
    return <div className="canvas"><div className="topbar"><div className="brand">✦ tuFelia</div></div><p style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-dim)' }}>Caricamento...</p></div>;
  }

  const haCredito = credito >= 30;

  return (
    <div className="canvas">
      <div className="topbar">
        <Link href={focus.startsWith('compatibilita') ? '/compatibilita' : '/sala'} className="back">← Indietro</Link>
        <div className="brand">✦ tuFelia</div>
      </div>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 400, textAlign: 'center', marginBottom: '6px' }}>Consulto Vocale</h1>
      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '22px' }}>Parla con tuFelia direttamente dal tuo browser.</p>

      {haCredito ? (
        <div style={{ background: 'rgba(6,214,160,0.06)', border: '1px solid rgba(6,214,160,0.3)', borderRadius: '10px', padding: '24px 20px', marginBottom: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '16px' }}>
            Hai un credito attivo. Clicca sul pulsante fluttuante in basso a destra per iniziare.
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '16px' }}>
            Se non vedi il pulsante, ricarica la pagina.
          </p>
          <button onClick={vaiAlPagamento} className="cta" style={{ width: '100%', fontSize: '14px', padding: '12px', background: 'transparent', border: '1px solid #F5A623', color: '#F5A623' }}>+ Aggiungi altri 15 minuti (19€)</button>
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '10px', padding: '30px 20px', marginBottom: '20px', textAlign: 'center' }}>
          {errore && <p style={{ fontSize: '13px', color: '#EF476F', marginBottom: '16px' }}>{errore}</p>}
          <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginBottom: '20px' }}>{nome ? `Ciao ${nome}, ` : ''}sblocca 15 minuti di accesso completo per 19€.</p>
          <button onClick={vaiAlPagamento} className="cta" style={{ fontSize: '16px', padding: '16px 32px', margin: '0 auto', display: 'inline-block' }}>Paga 19€ e inizia</button>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '16px' }}>Pagamento sicuro con Stripe. Nessun abbonamento.</p>
        </div>
      )}

      {haCredito && (
        <div style={{ marginTop: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-dim)', marginBottom: '6px' }}>
            <span>Credito residuo</span>
            <span style={{ color: credito <= 120 ? '#EF476F' : credito <= 300 ? '#F5A623' : '#06D6A0', fontWeight: 600 }}>
              {Math.floor(credito / 60)}:{(credito % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (credito / 990) * 100)}%`, height: '100%', background: credito <= 120 ? '#EF476F' : credito <= 300 ? '#F5A623' : '#06D6A0', transition: 'width 1s linear' }} />
          </div>
        </div>
      )}

      <div className="footer" style={{ marginTop: '40px' }}>
        <Link href="/privacy">Privacy</Link>·
        <Link href="/disclaimer">Disclaimer</Link>·
        <Link href="/faq">FAQ</Link>
      </div>
    </div>
  );
}

export default function ConsulenzaPage() {
  return (
    <Suspense fallback={<div className="canvas"><div className="topbar"><div className="brand">✦ tuFelia</div></div><p style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-dim)' }}>Caricamento...</p></div>}>
      <ConsulenzaContent />
    </Suspense>
  );
}
