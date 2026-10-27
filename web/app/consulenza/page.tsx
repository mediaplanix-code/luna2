'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_fZu14pfFefK76BRgk8e3e00";
const API_URL = "https://luna2-api.onrender.com";

function BarraTimer({ secondiRimasti }: { secondiRimasti: number }) {
  const minuti = Math.floor(secondiRimasti / 60);
  const secondi = secondiRimasti % 60;

  let colore = '#06D6A0'; // verde
  if (secondiRimasti <= 120) colore = '#EF476F'; // rosso (<2 min)
  else if (secondiRimasti <= 300) colore = '#F5A623'; // giallo (<5 min)

  const percentuale = Math.min(100, (secondiRimasti / (15 * 60)) * 100);

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-dim)', marginBottom: '6px' }}>
        <span>Tempo rimasto</span>
        <span style={{ color: colore, fontWeight: 600 }}>
          {String(minuti).padStart(2, '0')}:{String(secondi).padStart(2, '0')}
        </span>
      </div>
      <div style={{
        width: '100%',
        height: '10px',
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '6px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${percentuale}%`,
          height: '100%',
          background: colore,
          borderRadius: '6px',
          transition: 'width 1s linear, background 0.5s ease',
        }} />
      </div>
    </div>
  );
}

function ConsulenzaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focus = searchParams.get('focus') || 'generico';
  const pagato = searchParams.get('pagato');

  const [nome, setNome] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [secondiRimasti, setSecondiRimasti] = useState(0);
  const [accessoAttivo, setAccessoAttivo] = useState(false);
  const [inCaricamento, setInCaricamento] = useState(true);
  const [errore, setErrore] = useState('');
  const [confermato, setConfermato] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const etichetteFocus: Record<string, string> = {
    generico: 'Consulto Generale',
    tema_amore: 'Approfondimento Amore',
    tema_lavoro: 'Approfondimento Lavoro',
    tema_salute: 'Approfondimento Salute',
    tema_crescita: 'Approfondimento Crescita Personale',
    tema_previsioni: 'Approfondimento Previsioni',
    tema_pianeti: 'Approfondimento Pianeti',
    tema_case: 'Approfondimento Case',
    tema_aspetti: 'Approfondimento Aspetti',
    tema_transiti: 'Approfondimento Transiti',
    compatibilita_amore: 'Compatibilità Amorosa',
    compatibilita_lavoro: 'Compatibilità Lavorativa',
    compatibilita_salute: 'Compatibilità Salute',
    compatibilita_crescita: 'Compatibilità Crescita',
    compatibilita_previsioni: 'Compatibilità Previsioni',
    compatibilita: 'Compatibilità Generale',
  };

  const etichetta = etichetteFocus[focus] || 'Consulto';

  useEffect(() => {
    const n = localStorage.getItem('luna2_nome');
    if (n) setNome(n);
    const t = localStorage.getItem('luna2_token');
    if (!t) {
      router.push('/form');
      return;
    }
    setToken(t);
  }, [router]);

  // Se torniamo da Stripe con ?pagato=1, conferma il pagamento
  useEffect(() => {
    if (!token) return;
    if (pagato !== '1') return;
    if (confermato) return;

    setConfermato(true);
    fetch(`${API_URL}/conferma-pagamento/${token}`, { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        if (d.status === 'ok') {
          setSecondiRimasti(d.minuti * 60);
          setAccessoAttivo(true);
        } else {
          setErrore('Pagamento ricevuto ma non è stato possibile attivare l\'accesso. Contatta l\'assistenza.');
        }
      })
      .catch(() => setErrore('Pagamento ricevuto ma errore di connessione. Ricarica la pagina.'));
  }, [token, pagato, confermato]);

  // Controlla lo stato dell'accesso (all'avvio e ogni 30 secondi)
  useEffect(() => {
    if (!token) return;

    const controlla = () => {
      fetch(`${API_URL}/stato-accesso/${token}`)
        .then(r => r.json())
        .then(d => {
          setSecondiRimasti(d.secondi_rimasti || 0);
          setAccessoAttivo(d.attivo || false);
          setInCaricamento(false);
        })
        .catch(() => setInCaricamento(false));
    };

    controlla();
    const id = setInterval(controlla, 30000);
    return () => clearInterval(id);
  }, [token]);

  // Timer locale: decrementa ogni secondo
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!accessoAttivo || secondiRimasti <= 0) return;

    timerRef.current = setInterval(() => {
      setSecondiRimasti(prev => {
        if (prev <= 1) {
          setAccessoAttivo(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [accessoAttivo]);

  const vaiAlPagamento = () => {
    window.location.href = STRIPE_PAYMENT_LINK;
  };

  if (inCaricamento) {
    return (
      <div className="canvas">
        <div className="topbar">
          <div className="brand">✦ Luna Astrologica</div>
        </div>
        <p style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-dim)' }}>
          Caricamento...
        </p>
      </div>
    );
  }

  return (
    <div className="canvas">
      <div className="topbar">
        <Link href={focus.startsWith('compatibilita') ? '/compatibilita' : '/sala'} className="back">
          ← Indietro
        </Link>
        <div className="brand">✦ Luna Astrologica</div>
      </div>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 400, textAlign: 'center', marginBottom: '6px' }}>
        {etichetta}
      </h1>
      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '22px' }}>
        15 minuti di accesso a tutto: chat, voce e approfondimenti.
      </p>

      {accessoAttivo && secondiRimasti > 0 ? (
        <div style={{
          background: 'rgba(6,214,160,0.06)',
          border: '1px solid rgba(6,214,160,0.3)',
          borderRadius: '10px',
          padding: '24px 20px',
          marginBottom: '20px',
        }}>
          <BarraTimer secondiRimasti={secondiRimasti} />
          <p style={{ fontSize: '14px', color: 'var(--text)', textAlign: 'center', marginBottom: '16px' }}>
            Accesso attivo. Puoi usare chat, voce e approfondimenti.
          </p>
          <button
            onClick={vaiAlPagamento}
            className="cta"
            style={{ width: '100%', fontSize: '14px', padding: '12px', background: 'transparent', border: '1px solid #F5A623', color: '#F5A623' }}
          >
            + Aggiungi altri 15 minuti (19€)
          </button>
        </div>
      ) : (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(245,166,35,0.2)',
          borderRadius: '10px',
          padding: '30px 20px',
          marginBottom: '20px',
          textAlign: 'center',
        }}>
          {errore && (
            <p style={{ fontSize: '13px', color: '#EF476F', marginBottom: '16px' }}>
              {errore}
            </p>
          )}

          <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginBottom: '20px' }}>
            {nome ? `Ciao ${nome}, ` : ''}sblocca 15 minuti di accesso completo per 19€.
          </p>

          <button
            onClick={vaiAlPagamento}
            className="cta"
            style={{ fontSize: '16px', padding: '16px 32px', margin: '0 auto', display: 'inline-block' }}
          >
            Paga 19€ e inizia
          </button>

          <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '16px' }}>
            Pagamento sicuro con Stripe. Nessun abbonamento.
          </p>
        </div>
      )}

      <div style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--text)', marginBottom: '20px', marginTop: '24px' }}>
        <p style={{ marginBottom: '12px' }}>
          <strong>Cosa include:</strong>
        </p>
        <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
          <li>15 minuti di accesso a chat, voce e approfondimenti</li>
          <li>Analisi del tuo tema natale e dei transiti attuali</li>
          <li>Risposte alle tue domande specifiche</li>
        </ul>
      </div>

      <div className="footer">
        <Link href="/privacy">Privacy</Link>·
        <Link href="/disclaimer">Disclaimer</Link>·
        <Link href="/faq">?</Link>
      </div>
    </div>
  );
}

export default function ConsulenzaPage() {
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
      <ConsulenzaContent />
    </Suspense>
  );
}
