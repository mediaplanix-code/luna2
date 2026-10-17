import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="canvas">
      <div className="topbar">
        <Link href="/" className="back">← Home</Link>
        <div className="brand">✦ Luna Astrologica</div>
      </div>

      <h1 style={{
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
        fontWeight: 400,
        textAlign: 'center',
        marginBottom: '22px'
      }}>
        Informativa sulla privacy
      </h1>

      <div style={{
        fontSize: '14px',
        lineHeight: '1.7',
        color: 'var(--text)',
      }}>

        <h2 style={titoloSezione}>1. Titolare del trattamento</h2>
        <p>
          Luna Astrologica è un servizio di astrologia personalizzata.
          Per qualsiasi richiesta relativa ai tuoi dati personali puoi
          scrivere a <strong>privacy@lunaastrologica.it</strong>.
        </p>

        <h2 style={titoloSezione}>2. Quali dati raccogliamo</h2>
        <p>Per calcolare il tuo tema natale e inviarti gli oroscopi raccogliamo:</p>
        <ul style={lista}>
          <li>Nome</li>
          <li>Indirizzo email</li>
          <li>Data, ora e città di nascita</li>
          <li>Coordinate geografiche del luogo di nascita (latitudine, longitudine)</li>
          <li>Identificativo Telegram (solo se scegli di collegare il bot)</li>
        </ul>

        <h2 style={titoloSezione}>3. Perché li raccogliamo</h2>
        <p>I tuoi dati sono utilizzati esclusivamente per:</p>
        <ul style={lista}>
          <li>Calcolare il tuo tema natale</li>
          <li>Generarti oroscopi e avvisi personalizzati</li>
          <li>Inviarti i messaggi tramite Telegram (se collegato)</li>
          <li>Permetterti di accedere alla tua area personale</li>
          <li>Rispondere alle tue domande nella chat</li>
        </ul>
        <p>
          <strong>Non utilizziamo i tuoi dati per pubblicità</strong>, non li vendiamo
          a terzi e non li condividiamo con nessuno al di fuori dei fornitori tecnici
          strettamente necessari (vedi punto 5).
        </p>

        <h2 style={titoloSezione}>4. Base giuridica</h2>
        <p>
          Il trattamento si basa sul tuo <strong>consenso esplicito</strong>,
          che presti al momento dell&apos;iscrizione. Puoi ritirarlo in qualsiasi
          momento scrivendo all&apos;indirizzo del punto 1.
        </p>

        <h2 style={titoloSezione}>5. Dove sono conservati i dati</h2>
        <p>I tuoi dati sono conservati su:</p>
        <ul style={lista}>
          <li>
            <strong>Supabase</strong> (database PostgreSQL, server nell&apos;Unione Europea)
          </li>
          <li>
            <strong>Render</strong> (servizio di calcolo, server negli Stati Uniti)
          </li>
          <li>
            <strong>Telegram</strong> (solo se colleghi il bot, per l&apos;invio dei messaggi)
          </li>
          <li>
            <strong>Groq / DeepSeek</strong> (per la generazione dei testi — i dati
            vengono inviati in forma anonima, senza nome ed email)
          </li>
        </ul>

        <h2 style={titoloSezione}>6. Per quanto tempo</h2>
        <p>
          Conserviamo i tuoi dati finché il tuo profilo è attivo. Se richiedi la
          cancellazione, i dati vengono eliminati entro 30 giorni.
        </p>

        <h2 style={titoloSezione}>7. I tuoi diritti</h2>
        <p>Hai diritto a:</p>
        <ul style={lista}>
          <li>Accedere ai tuoi dati personali</li>
          <li>Chiederne la correzione</li>
          <li>Chiederne la cancellazione</li>
          <li>Opporti al trattamento</li>
          <li>Richiedere la portabilità</li>
        </ul>
        <p>
          Per esercitare questi diritti scrivi a <strong>privacy@lunaastrologica.it</strong>.
        </p>

        <h2 style={titoloSezione}>8. Cookie</h2>
        <p>
          Luna Astrologica utilizza solo cookie tecnici e memoria locale
          (localStorage) strettamente necessari al funzionamento del sito.
          Non utilizziamo cookie di tracciamento o profilazione.
        </p>

        <h2 style={titoloSezione}>9. Modifiche</h2>
        <p>
          Questa informativa può essere aggiornata. La versione vigente è
          sempre pubblicata su questa pagina.
        </p>

        <p style={{ marginTop: '30px', fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
          Ultimo aggiornamento: ottobre 2026.
        </p>
      </div>

      <div className="footer">
        <Link href="/privacy">Privacy</Link>·
        <Link href="/disclaimer">Disclaimer</Link>·
        <Link href="/faq">?</Link>
      </div>
    </div>
  );
}

const titoloSezione: React.CSSProperties = {
  fontFamily: 'Georgia, serif',
  fontSize: '16px',
  fontWeight: 400,
  marginTop: '24px',
  marginBottom: '8px',
  color: '#F5A623',
};

const lista: React.CSSProperties = {
  paddingLeft: '20px',
  marginBottom: '12px',
};
