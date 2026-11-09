'use client';

import Link from 'next/link';

export default function ConfermaEmailPage() {
  return (
    <div className="canvas">
      <div className="topbar">
        <Link href="/" className="back">← Home</Link>
        <div className="brand">✦ tuFelia</div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '60px', padding: '0 20px' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>📩</div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: 400, marginBottom: '16px' }}>
          Controlla la tua email
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--text-dim)', lineHeight: '1.8', maxWidth: '400px', margin: '0 auto 30px' }}>
          Ti abbiamo inviato un link di conferma. Clicca il pulsante nell'email per attivare il tuo account e accedere alla tua Sala personale.
        </p>
        
        <div style={{ background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '10px', padding: '20px', display: 'inline-block' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
            Non hai ricevuto l'email? Controlla nella cartella <strong>Spam</strong> o <strong>Promozioni</strong>.
          </p>
        </div>
      </div>

      <div className="footer" style={{ marginTop: '80px' }}>
        <Link href="/privacy">Privacy</Link>·
        <Link href="/disclaimer">Disclaimer</Link>·
        <Link href="/faq">FAQ</Link>
      </div>
    </div>
  );
}
