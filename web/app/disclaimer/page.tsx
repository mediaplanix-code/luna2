import Link from 'next/link';

export default function DisclaimerPage() {
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
        Disclaimer
      </h1>

      <div style={{
        fontSize: '14px',
        lineHeight: '1.7',
        color: 'var(--text)',
      }}>

        <h2 style={titoloSezione}>Natura del servizio</h2>
        <p>
          Luna Astrologica offre contenuti di astrologia a scopo di
          <strong> intrattenimento, crescita personale e riflessione</strong>.
          I testi, gli oroscopi, le chat e le consulenze vocali non costituiscono
          in alcun modo:
        </p>
        <ul style={lista}>
          <li>consulenza medica, psicologica o psichiatrica</li>
          <li>consulenza legale, fiscale o finanziaria</li>
          <li>previsione di eventi futuri con valore scientifico</li>
        </ul>

        <h2 style={titoloSezione}>Responsabilità dell&apos;utente</h2>
        <p>
          Le decisioni che prendi nella tua vita restano di tua esclusiva
          responsabilità. Luna Astrologica non può essere ritenuta responsabile
          di scelte personali, professionali, affettive o economiche compiute
          sulla base dei contenuti del servizio.
        </p>
        <p>
          Se stai attraversando un momento di difficoltà psicologica, rivolgiti
          a un professionista qualificato. In caso di emergenza chiama il
          <strong> 112</strong>.
        </p>

        <h2 style={titoloSezione}>Precisione dei calcoli</h2>
        <p>
          Il tema natale viene calcolato con l&apos;effemeride svizzera
          (<em>Swiss Ephemeris</em>), lo stesso sistema usato in ambito
          astronomico. L&apos;interpretazione astrologica che ne deriva è invece
          di natura simbolica e soggettiva, e non ha valore predittivo.
        </p>

        <h2 style={titoloSezione}>Contenuti generati</h2>
        <p>
          Alcuni testi (oroscopi, risposte in chat, copioni vocali) sono
          prodotti con il supporto di sistemi automatici a partire dal tuo
          tema natale. Vengono rivisti nel loro impianto generale, ma possono
          contenere imprecisioni. Se qualcosa non ti risuona, non è un
          problema tuo: è la natura dello strumento.
        </p>

        <h2 style={titoloSezione}>Pagamenti e rimborsi</h2>
        <p>
          Le consulenze vocali sono soggette a pagamento anticipato. Una volta
          erogata la consulenza, non è previsto rimborso. Se la consulenza non
          viene erogata per causa nostra, il rimborso è integrale e automatico.
        </p>

        <h2 style={titoloSezione}>Limitazione di responsabilità</h2>
        <p>
          Luna Astrologica non garantisce la continuità ininterrotta del
          servizio. Potrebbero verificarsi interruzioni tecniche per
          manutenzione, aggiornamenti o cause di forza maggiore. In tali casi
          il servizio verrà ripristinato nel più breve tempo possibile.
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
