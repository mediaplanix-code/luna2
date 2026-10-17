import Link from 'next/link';

export default function VerificaInviataPage() {
  return (
    <div className="canvas">
      <div className="topbar">
        <Link href="/" className="back">← Home</Link>
        <div className="brand">✦ Luna Astrologica</div>
      </div>
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 400, textAlign: 'center', marginBottom: '16px' }}>Controlla la tua email 📬</h1>
      <p style={{ textAlign: 'center', fontSize: '15px', lineHeight: '1.6', color: 'var(--text-dim)' }}>
        Ti abbiamo inviato un link di verifica.<br />
        Cliccalo per attivare il tuo profilo e accedere alla sala.
      </p>
      <p style={{ textAlign: 'center', marginTop: '30px', fontSize: '12px', color: 'var(--text-dim)' }}>
        Non lo trovi? Controlla la cartella spam.
      </p>
      <div className="footer">
        <Link href="/privacy">Privacy</Link>·<Link href="/disclaimer">Disclaimer</Link>·<Link href="/faq">?</Link>
      </div>
    </div>
  );
}
