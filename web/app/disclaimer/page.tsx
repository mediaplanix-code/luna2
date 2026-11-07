import Link from 'next/link';

export default function DisclaimerPage() {
  return (
    <div className="canvas">
      <div className="topbar">
        <Link href="/" className="back">← Indietro</Link>
        <div className="brand">✦ tuFelia</div>
      </div>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 400, textAlign: 'center', marginBottom: '6px' }}>
        Disclaimer
      </h1>
      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '22px' }}>
        Avvertenze importanti
      </p>

      <div style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--text)', marginBottom: '20px' }}>
        <p style={{ marginBottom: '14px' }}>
          <strong>Natura del servizio</strong><br />
          tuFelia è un servizio di intrattenimento e introspezione personale basato sull'astrologia. Non fornisce consulenza medica, psicologica, legale, finanziaria o professionale di alcun tipo.
        </p>

        <p style={{ marginBottom: '14px' }}>
          <strong>Nessuna sostituzione professionale</strong><br />
          Le interpretazioni astrologiche, gli oroscopi, le risposte in chat, le interpretazioni dei sogni e i consulti vocali non sostituiscono in alcun modo il parere di un medico, psicologo, avvocato, commercialista o altro professionista qualificato.
        </p>

        <p style={{ marginBottom: '14px' }}>
          <strong>Responsabilità dell'utente</strong><br />
          Le decisioni che prendi nella tua vita sono di tua esclusiva responsabilità. tuFelia non è responsabile per azioni, omissioni o conseguenze derivanti dall'uso delle informazioni fornite.
        </p>

        <p style={{ marginBottom: '14px' }}>
          <strong>Precisione dei calcoli</strong><br />
          I calcoli astrologici sono effettuati con Swiss Ephemeris, uno standard professionale. Tuttavia, la precisione del tema natale dipende dall'esattezza dei dati di nascita forniti (data, ora, luogo). Ora di nascita approssimativa produce un tema natale approssimativo.
        </p>

        <p style={{ marginBottom: '14px' }}>
          <strong>Contenuti generati con AI</strong><br />
          Le interpretazioni sono generate con l'ausilio di intelligenza artificiale sulla base di dati astrologici reali. Possono contenere imprecisioni o interpretazioni non condivisibili. Sono da intendersi come spunti di riflessione, non come verità assolute.
        </p>

        <p style={{ marginBottom: '14px' }}>
          <strong>Pagamenti</strong><br />
          I consulti vocali e gli eventuali prodotti a pagamento sono soggetti a pagamento anticipato tramite Stripe. Non sono previsti rimborsi una volta erogato il servizio, salvo diverso accordo.
        </p>

        <p style={{ marginBottom: '14px' }}>
          <strong>Limitazione di responsabilità</strong><br />
          tuFelia non è responsabile per interruzioni del servizio, perdita di dati, malfunzionamenti tecnici o danni indiretti derivanti dall'uso della piattaforma.
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
