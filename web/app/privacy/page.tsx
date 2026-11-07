import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="canvas">
      <div className="topbar">
        <Link href="/" className="back">← Indietro</Link>
        <div className="brand">✦ tuFelia</div>
      </div>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 400, textAlign: 'center', marginBottom: '6px' }}>
        Privacy
      </h1>
      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '22px' }}>
        Informativa sul trattamento dei dati personali
      </p>

      <div style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--text)', marginBottom: '20px' }}>
        <p style={{ marginBottom: '14px' }}>
          <strong>Titolare del trattamento</strong><br />
          tuFelia tratta i tuoi dati personali nel rispetto del Regolamento UE 2016/679 (GDPR).
        </p>

        <p style={{ marginBottom: '14px' }}>
          <strong>Quali dati raccogliamo</strong><br />
          Nome, email, data, ora e luogo di nascita, sesso, coordinate geografiche della città di nascita, numero di telefono (se fornito), identificativo Telegram (se collegato). Questi dati sono necessari per calcolare il tuo tema natale e inviarti gli oroscopi personalizzati.
        </p>

        <p style={{ marginBottom: '14px' }}>
          <strong>Perché li raccogliamo</strong><br />
          Per calcolare il tema natale, generare gli oroscopi settimanali, gli alert e le interpretazioni dei sogni. Per consentirti l'accesso alla chat e ai consulti vocali. Per adempiere a obblighi legali e fiscali in caso di acquisto.
        </p>

        <p style={{ marginBottom: '14px' }}>
          <strong>Dove sono conservati</strong><br />
          I dati sono conservati su Supabase (database PostgreSQL) con server nell'Unione Europea. Le comunicazioni avvengono tramite Telegram. I pagamenti, se effettuati, sono gestiti da Stripe.
        </p>

        <p style={{ marginBottom: '14px' }}>
          <strong>Per quanto tempo</strong><br />
          I dati sono conservati fino alla richiesta di cancellazione. Puoi chiedere in qualsiasi momento la cancellazione dei tuoi dati scrivendo al titolare.
        </p>

        <p style={{ marginBottom: '14px' }}>
          <strong>I tuoi diritti</strong><br />
          Hai diritto di accesso, rettifica, cancellazione, limitazione, portabilità e opposizione al trattamento. Puoi esercitare questi diritti scrivendo al titolare del trattamento.
        </p>

        <p style={{ marginBottom: '14px' }}>
          <strong>Cookie</strong><br />
          Il sito utilizza esclusivamente localStorage del browser per mantenere la sessione (token di accesso e nome). Non utilizziamo cookie di profilazione né tracker di terze parti.
        </p>

        <p style={{ marginBottom: '14px' }}>
          <strong>Contatti</strong><br />
          Per qualsiasi richiesta relativa ai tuoi dati personali, scrivi al titolare del trattamento.
        </p>
      </div>

      <div className="footer">
        <Link href="/privacy">Privacy</Link>·
        <Link href="/disclaimer">Disclaimer</Link>·
        <Link href="/faq">FAQ</Link>
      </div>
    </div>
  );
}
