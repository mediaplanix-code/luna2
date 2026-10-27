'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API_URL = "https://luna2-api.onrender.com";

function GrazieContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [stato, setStato] = useState<'loading' | 'ok' | 'errore'>('loading');
  const [messaggio, setMessaggio] = useState('');

  useEffect(() => {
    const t = searchParams.get('token') || localStorage.getItem('luna2_token');
    if (!t) {
      router.push('/form');
      return;
    }
    setToken(t);
    const n = localStorage.getItem('luna2_nome');
    if (n) setNome(n);
  }, [router, searchParams]);

  useEffect(() => {
    if (!token) return;

    // Qui confermiamo il pagamento (diamo i 15 minuti di "credito" al profilo)
    fetch(`${API_URL}/conferma-pagamento/${token}`, { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        if (d.status === 'ok') {
          setStato('ok');
        } else {
          setStato('errore');
          setMessaggio('Pagamento ricevuto ma non è stato possibile attivare l\'accesso. Ricarica la pagina o contatta l\'assistenza.');
        }
      })
      .catch(() => {
        setStato('errore');
        setMessaggio('Errore di connessione. Il pagamento è andato a buon fine ma l\'accesso non è stato attivato. Ricarica la pagina.');
      });
  }, [token]);

  // Funzione che fa partire il timer e porta l'utente dove vuole andare
  const iniziaUso = (destinazione: string) => {
    if (!token) return;
    
    // Chiamiamo un nuovo endpoint che fa partire il timer a questo preciso istante
    fetch(`${API_URL}/inizia-accesso/${token}`, { method: 'POST' })
      .then(() => {
        router.push(destinazione);
      })
      .catch(() => {
        // Se per qualche motivo la chiamata fallisce, navighiamo lo stesso
        router.push(destinazione);
      });
  };

  if (stato === 'loading') {
    return (
      <div className="canvas">
        <div className="topbar">
          <div className="brand">✦ Luna Astrologica</div>
        </div>
        <p style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-dim)' }}>
          Sto attivando il tuo accesso...
        </p>
      </div>
    );
  }

  if (stato === 'errore') {
    return (
      <div className="canvas">
        <div className="topbar">
          <div className="brand">✦ Luna Astrologica</div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '40px', padding: '0 20px' }}>
          <p style={{ fontSize: '15px', color: '#EF476F', marginBottom: '20px' }}>{messaggio}</p>
          <Link href="/consulenza" className="cta" style={{ display: 'inline-block', fontSize: '14px', padding: '12px 24px' }}>
            Riprova
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="canvas">
      <div className="topbar">
        <div className="brand">✦ Luna Astrologica</div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '40px', marginBottom: '30px' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>✅</div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 400, marginBottom: '10px' }}>
          Pagamento confermato
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--text-dim)', lineHeight: '1.6', maxWidth: '380px', margin: '0 auto' }}>
          {nome ? `Grazie ${nome}! ` : 'Grazie! '}
          Il tuo credito di 15 minuti è pronto. Scegli da dove iniziare: il tempo inizierà a scorrere solo quando clicchi.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button
          onClick={() => iniziaUso('/chat')}
          className="cta"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', padding: '16px', border: 'none', cursor: 'pointer' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Inizia la chat
        </button>

        <button
          onClick={() => iniziaUso('/sala')}
          className="cta"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', padding: '16px', background: 'transparent', border: '1px solid var(--text-dim)', color: 'var(--text-dim)', cursor: 'pointer' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Torna alla sala
        </button>

        <button
          onClick={() => iniziaUso('/consulenza')}
          className="cta"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', padding: '16px', background: 'transparent', border: '1px solid #F5A623', color: '#F5A623', cursor: 'pointer' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
          Parla con Luna
        </button>
      </div>

      <div className="footer" style={{ marginTop: '40px' }}>
        <Link href="/privacy">Privacy</Link>·
        <Link href="/disclaimer">Disclaimer</Link>·
        <Link href="/faq">?</Link>
      </div>
    </div>
  );
}

export default function GraziePage() {
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
      <GrazieContent />
    </Suspense>
  );
}
