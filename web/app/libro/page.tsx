'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_fZu14pfFefK76BRgk8e3e00"; // <-- SOSTITUISCI CON IL LINK PER IL LIBRO (39€)

function LibroContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nome, setNome] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [errore, setErrore] = useState('');
  const [inCaricamento, setInCaricamento] = useState(true);

  useEffect(() => {
    const n = localStorage.getItem('luna2_nome');
    if (n) setNome(n);
    const t = localStorage.getItem('luna2_token');
    if (!t) { router.push('/form'); return; }
    setToken(t);
    setInCaricamento(false);
  }, [router]);

  const acquista = () => {
    if (!token) return;
    // Salviamo il token nel localStorage (già fatto) e andiamo a Stripe
    // (Stripe, al ritorno, ci riporterà a /grazie-libro?pagato=1)
    window.location.href = STRIPE_PAYMENT_LINK;
  };

  if (inCaricamento) {
    return <div className="canvas"><div className="topbar"><div className="brand">✦ Luna Astrologica</div></div><p style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-dim)' }}>Caricamento...</p></div>;
  }

  return (
    <div className="canvas">
      <div className="topbar">
        <Link href="/sala" className="back">← Indietro</Link>
        <div className="brand">✦ Luna Astrologica</div>
      </div>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 400, textAlign: 'center', marginBottom: '6px' }}>
        Il Tuo Cielo 2027
      </h1>
      <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-dim)', marginBottom: '22px' }}>
        Un libro astrologico scritto solo per te.
      </p>

      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '10px', padding: '30px 20px', marginBottom: '20px', textAlign: 'center' }}>
        <p style={{ fontSize: '15px', color: 'var(--text)', marginBottom: '10px', fontStyle: 'italic' }}>
          "Un viaggio nel tuo 2027, tra pianeti, case, transiti e previsioni mese per mese."
        </p>
        <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginBottom: '20px' }}>
          Il tuo libro è un'opera unica, creata analizzando la tua carta natale e i tuoi transiti personali.
        </p>
        <p style={{ fontSize: '16px', color: '#F5A623', fontWeight: 600, marginBottom: '20px' }}>
          Prezzo: 39€
        </p>
        <button onClick={acquista} className="cta" style={{ fontSize: '16px', padding: '16px 32px', margin: '0 auto', display: 'inline-block' }}>
          Acquista il tuo libro
        </button>
        <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '16px' }}>
          Dopo il pagamento, riceverai il libro via email entro 3 ore.
        </p>
      </div>

      <div className="footer" style={{ marginTop: '40px' }}>
        <Link href="/privacy">Privacy</Link>·
        <Link href="/disclaimer">Disclaimer</Link>·
        <Link href="/faq">?</Link>
      </div>
    </div>
  );
}

export default function LibroPage() {
  return (
    <Suspense fallback={<div className="canvas"><p style={{ textAlign: 'center', marginTop: '40px' }}>Caricamento...</p></div>}>
      <LibroContent />
    </Suspense>
  );
}
