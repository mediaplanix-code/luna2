import Link from 'next/link';
import Accordion from '../components/Accordion';

export default function FaqPage() {
  return (
    <div className="canvas">
      <div className="topbar">
        <Link href="/" className="back">← Indietro</Link>
        <div className="brand">✦ tuFelia</div>
      </div>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 400, textAlign: 'center', marginBottom: '6px' }}>
        Domande frequenti
      </h1>
      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '22px' }}>
        Le risposte alle domande più comuni
      </p>

      <div className="accordion">
        <Accordion title="Cos'è tuFelia?" bare>
          Un servizio di astrologia personalizzata basato esclusivamente sul tuo tema natale reale.
          Invio settimanale del tuo oroscopo, alert sui transiti importanti, chat di approfondimento
          e consulti vocali di 15 minuti.
        </Accordion>

        <Accordion title="Come viene calcolato il mio tema natale?" bare>
          Con Swiss Ephemeris, lo stesso standard professionale usato dagli astrologi. Servono data,
          ora e luogo di nascita esatti. Se non conosci l'ora esatta, il tema sarà approssimativo
          soprattutto per Ascendente e case.
        </Accordion>

        <Accordion title="L'iscrizione è gratuita?" bare>
          Sì, l'iscrizione è gratuita. Il messaggio settimanale e gli alert sono gratuiti. La chat
          è gratuita per le prime 3 domande. I consulti vocali sono a pagamento.
        </Accordion>

        <Accordion title="Come funziona la chat?" bare>
          Puoi fare una domanda alla volta, fino a 3 domande gratuite. Ogni domanda riceve una
          risposta personalizzata basata sul tuo tema natale. Le domande sono approfondimenti,
          non sostituiscono un consulto vocale.
        </Accordion>

        <Accordion title="Come funzionano i sogni?" bare>
          Puoi raccontare un sogno e ricevere un'interpretazione simbolica gratuita una volta a
          settimana. Per approfondire, prenota un consulto vocale.
        </Accordion>

        <Accordion title="Come funziona il consulto vocale?" bare>
          È una conversazione telefonica di 15 minuti con la tua astrologa. Parli del tuo tema
          natale, dei transiti attuali e delle tue domande. Si prenota e si paga anticipatamente.
        </Accordion>

        <Accordion title="Come ricevo l'oroscopo?" bare>
          Se colleghi il bot Telegram @Luna2OroscopoBot, ricevi l'oroscopo settimanale direttamente
          in chat. Altrimenti puoi consultarlo dalla tua sala personale.
        </Accordion>

        <Accordion title="I miei dati sono al sicuro?" bare>
          Sì. I dati sono conservati su Supabase con server in Unione Europea. Non vendiamo né
          condividiamo i tuoi dati con terze parti per finalità di marketing. Puoi chiedere la
          cancellazione in qualsiasi momento.
        </Accordion>

        <Accordion title="Posso cambiare il mio tema natale?" bare>
          Sì, se hai inserito dati errati puoi rifare il form con i dati corretti. Il sistema
          aggiorna il tuo profilo mantenendo lo stesso accesso.
        </Accordion>

        <Accordion title="Cosa sono gli alert?" bare>
          Sono avvisi anticipati sui transiti lenti (Giove, Saturno, Urano, Nettuno, Plutone) che
          toccano punti importanti del tuo tema natale. Ti arrivano via Telegram quando un transito
          importante è in arrivo, per prepararti invece di subirlo.
        </Accordion>
      </div>

      <div className="footer">
        <Link href="/privacy">Privacy</Link>·
        <Link href="/disclaimer">Disclaimer</Link>·
        <Link href="/faq">FAQ</Link>
      </div>
    </div>
  );
}
