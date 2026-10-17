import Link from 'next/link';
import Accordion from '../components/Accordion';

export default function FaqPage() {
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
        marginBottom: '6px'
      }}>
        Domande frequenti
      </h1>
      <p style={{
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--text-dim)',
        marginBottom: '22px'
      }}>
        Le risposte alle domande più comuni.
      </p>

      <div className="accordion">

        <Accordion title="Che cos'è Luna Astrologica?" bare>
          È un servizio di astrologia personalizzata. Calcoliamo il tuo tema
          natale reale (con effemeridi astronomiche), ti inviamo un oroscopo
          settimanale su Telegram e ti diamo la possibilità di approfondire
          con una chat o una consulenza vocale.
        </Accordion>

        <Accordion title="Perché serve l'ora esatta di nascita?" bare>
          L&apos;ora di nascita è indispensabile per calcolare l&apos;Ascendente
          e le Case astrologiche. Senza l&apos;ora esatta, il tema natale è
          incompleto. Se non la ricordi, puoi richiederla all&apos;anagrafe
          del tuo comune di nascita.
        </Accordion>

        <Accordion title="Che differenza c'è tra Luna Astrologica e un oroscopo generico?" bare>
          Un oroscopo generico parla a tutti i nati dello stesso segno. Luna
          Astrologica parte dal <strong>tuo</strong> tema natale reale: la tua
          Luna, il tuo Ascendente, le tue case, i tuoi transiti. È un&apos;altra
          cosa.
        </Accordion>

        <Accordion title="Come ricevo gli oroscopi?" bare>
          Su Telegram. Dopo l&apos;iscrizione, ti basta collegare il bot
          @Luna2OroscopoBot con un click. Ogni domenica mattina ricevi il tuo
          oroscopo settimanale. Quando ci sono transiti importanti, ricevi un
          avviso dedicato.
        </Accordion>

        <Accordion title="Quante domande gratuite ho in chat?" bare>
          Tre. Puoi usarle come vuoi, su un unico argomento o su tre argomenti
          diversi. Quando le hai esaurite, puoi prenotare una consulenza vocale
          di 15 minuti.
        </Accordion>

        <Accordion title="Come funziona la consulenza vocale?" bare>
          È una sessione di 15 minuti al telefono con un&apos;astrologa. Parli
          del momento astrale del tuo tema, fai le domande che ti stanno a
          cuore. Costo: 19€. La prenoti dal tuo profilo.
        </Accordion>

        <Accordion title="I miei dati sono al sicuro?" bare>
          Sì. I tuoi dati sono conservati su Supabase (server in Europa), non
          vengono mai venduti, e li usiamo solo per calcolare il tuo tema e
          inviarti gli oroscopi. Puoi leggerlo in dettaglio nella nostra
          <Link href="/privacy" style={{ color: '#F5A623', textDecoration: 'underline' }}> informativa sulla privacy</Link>.
        </Accordion>

        <Accordion title="Posso cancellare il mio profilo?" bare>
          Sì, in qualsiasi momento. Scrivi a privacy@lunaastrologica.it e i
          tuoi dati vengono eliminati entro 30 giorni.
        </Accordion>

        <Accordion title="Come disattivo i messaggi su Telegram?" bare>
          Apri il bot @Luna2OroscopoBot e invia il comando <strong>/stop</strong>.
          Puoi riattivarli in qualsiasi momento con /start.
        </Accordion>

        <Accordion title="Cosa succede se salto una settimana?" bare>
          Nulla di grave. L&apos;oroscopo settimanale è personale e viene
          generato ogni domenica. Se lo perdi, puoi sempre consultare il tuo
          profilo per i transiti attivi.
        </Accordion>

        <Accordion title="È tutto automatico?" bare>
          Il calcolo del tema natale è automatico e preciso. I testi degli
          oroscopi vengono preparati a partire dal tuo tema e rivisti nel loro
          impianto generale. La consulenza vocale invece è una persona vera
          che ti parla.
        </Accordion>

        <Accordion title="Ho un'altra domanda, come vi contatto?" bare>
          Scrivi a <strong>info@lunaastrologica.it</strong>. Rispondiamo entro
          24-48 ore.
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
