import Link from 'next/link';
import Accordion from './components/Accordion';

export default function Landing() {
  return (
    <div className="canvas">
      <div className="topbar">
        <div className="brand">✦ Luna Astrologica</div>
        <Link href="/form" className="login">Accedi</Link>
      </div>

      <div className="hero">
        <h1>Parla col tuo futuro.</h1>
        <Link href="/form" className="cta">Personalizza</Link>
      </div>

      <div className="accordion">
        <Accordion title="Cos'è Luna Astrologica" bare>
          Un servizio di astrologia personalizzata basato esclusivamente sul tuo tema natale.
          Invio settimanale del tuo oroscopo, con possibilità di consulto di approfondimento con
          la voce. Possibili ulteriori invii di alert, uno o due al cambio importante del tuo cielo.
          E se desideri approfondire, ci parliamo. Con la voce.
        </Accordion>

        <Accordion title="Come funziona" bare>
          Ti iscrivi, inserisci i tuoi dati di nascita, e il tuo profilo è pronto. Ti scrivo
          attraverso Telegram, email o WhatsApp il tuo oroscopo personalizzato. E quando vuoi
          approfondire, ci parliamo. Con la voce. Tutto qui.
        </Accordion>

        <Accordion title="Gli alert" bare>
          Gli alert sono le spiegazioni in anticipo di ciò che è previsto nel tuo cielo, per
          affrontarlo in modo preparato e non subirlo.
        </Accordion>

        <Accordion title="La voce con cui parli" bare>
          Quando vuoi approfondire, prenoti una sessione vocale di 15 minuti. Parliamo del momento
          astrale del tuo personalissimo tema, delle tue domande, di quello che ti sta a cuore.
          Un vero consulto dedicato.
        </Accordion>

        <Accordion title="Quanto costa" bare>
          L&apos;iscrizione è gratuita. Il messaggio settimanale e gli avvisi sono gratuiti. La chat
          è gratuita per le prime 5 domande. La sessione vocale ha un costo per consulto.
          Nessun abbonamento, nessun costo nascosto.
        </Accordion>
      </div>

      <div className="footer">
        <Link href="/privacy">Privacy</Link>·
        <Link href="/disclaimer">Disclaimer</Link>·
        <Link href="/faq">?</Link>
      </div>
    </div>
  );
}
