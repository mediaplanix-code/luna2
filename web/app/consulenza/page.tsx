'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Vapi from '@vapi-ai/web';

const VAPI_PUBLIC_KEY = "73d30b26-4506-4edd-8037-a32959293655";
const VAPI_WEBHOOK_URL = "https://luna2-api.onrender.com/vapi/webhook";

function ConsulenzaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focus = searchParams.get('focus') || 'generico';

  const [nome, setNome] = useState('');
  const [callAttiva, setCallAttiva] = useState(false);
  const [inCaricamento, setInCaricamento] = useState(false);
  const [errore, setErrore] = useState('');
  
  const vapiRef = useRef<Vapi | null>(null);

  useEffect(() => {
    const nomeSalvato = localStorage.getItem('luna2_nome');
    if (nomeSalvato) setNome(nomeSalvato);

    const vapi = new Vapi(VAPI_PUBLIC_KEY);
    vapiRef.current = vapi;

    vapi.on('call-start', () => {
      setCallAttiva(true);
      setInCaricamento(false);
    });

    vapi.on('call-end', () => {
      setCallAttiva(false);
      setInCaricamento(false);
    });

    vapi.on('error', (e: any) => {
      console.error('Errore Vapi:', e);
      setErrore('Si è verificato un problema con la chiamata. Riprova.');
      setCallAttiva(false);
      setInCaricamento(false);
    });

    return () => {
      vapi.stop();
    };
  }, []);

  const avviaChiamata = async () => {
    if (!vapiRef.current) return;
    setInCaricamento(true);
    setErrore('');
    try {
      const token = localStorage.getItem('luna2_token');
      
      // Passiamo un assistente transiente (inline) con server URL e metadati dentro assistantOverrides.
      // Questo è l'unico modo per far chiamare il webhook alla Web SDK.
      await vapiRef.current.start({
        name: "Luna - La tua astrologa",
        firstMessage: "Ciao, sono Luna. Benvenuto al tuo consulto. Dimmi pure cosa ti sta a cuore.",
        model: {
          provider: "openai",
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "Sei Luna, un'astrologa italiana esperta. Rispondi in italiano con tono caldo e mistico."
            }
          ]
        },
        server: {
          url: VAPI_WEBHOOK_URL
        },
        assistantOverrides: {
          metadata: {
            token: token
          }
        }
      });
    } catch (e) {
      console.error(e);
      setErrore('Impossibile avviare la chiamata. Controlla il microfono.');
      setInCaricamento(false);
    }
  };

  const fermaChiamata = () => {
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
  };

  const etichetteFocus: Record<string, string> = {
    generico: 'Consulto Generale',
    tema_amore: 'Approfondimento Amore',
    tema_lavoro: 'Approfondimento Lavoro',
    tema_salute: 'Approfondimento Salute',
    tema_crescita: 'Approfondimento Crescita Personale',
    tema_previsioni: 'Approfondimento Previsioni',
    tema_pianeti: 'Approfondimento Pianeti',
    tema_case: 'Approfondimento Case',
    tema_aspetti: 'Approfondimento Aspetti',
    tema_transiti: 'Approfondimento Transiti',
    compatibilita_amore: 'Compatibilità Amorosa',
    compatibilita_lavoro: 'Compatibilità Lavorativa',
    compatibilita_salute: 'Compatibilità Salute',
    compatibilita_crescita: 'Compatibilità Crescita',
    compatibilita_previsioni: 'Compatibilità Previsioni',
    compatibilita: 'Compatibilità Generale',
  };

  const etichetta = etichetteFocus[focus] || 'Consulto';

  return (
    <div className="canvas">
      <div className="topbar">
        <Link href={focus.startsWith('compatibilita') ? '/compatibilita' : '/sala'} className="back">
          ← Indietro
        </Link>
        <div className="brand">✦ Luna Astrologica</div>
      </div>

      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 400, textAlign: 'center', marginBottom: '6px' }}>
        {etichetta}
      </h1>
      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '22px' }}>
        Un consulto vocale di 15 minuti con la tua astrologa.
      </p>

      <div style={{ 
        background: 'rgba(255,255,255,0.03)', 
        border: '1px solid rgba(245,166,35,0.2)', 
        borderRadius: '10px', 
        padding: '30px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginBottom: '16px' }}>
          {callAttiva ? 'Luna è in linea. Parla pure.' : 'Clicca per parlare con Luna.'}
        </p>

        {!callAttiva ? (
          <button 
            onClick={avviaChiamata}
            disabled={inCaricamento}
            className="cta"
            style={{ 
              fontSize: '16px',
              padding: '16px 32px',
              margin: '0 auto',
              display: 'inline-block'
            }}
          >
            {inCaricamento ? 'Sto connettendo...' : 'Parla con Luna'}
          </button>
        ) : (
          <button 
            onClick={fermaChiamata}
            className="cta"
            style={{ 
              fontSize: '16px',
              padding: '16px 32px',
              margin: '0 auto',
              display: 'inline-block',
              background: 'transparent',
              border: '1px solid #EF476F',
              color: '#EF476F'
            }}
          >
            Termina chiamata
          </button>
        )}

        {errore && (
          <p style={{ fontSize: '13px', color: '#EF476F', marginTop: '16px' }}>
            {errore}
          </p>
        )}
      </div>

      <div style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--text)', marginBottom: '20px', marginTop: '24px' }}>
        <p style={{ marginBottom: '12px' }}>
          <strong>Cosa include:</strong>
        </p>
        <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
          <li>15 minuti di conversazione vocale</li>
          <li>Analisi del tuo tema natale e dei transiti attuali</li>
          <li>Risposte alle tue domande specifiche</li>
        </ul>
        {nome && (
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
            Ciao {nome}, quando vuoi siamo pronti.
          </p>
        )}
      </div>

      <div className="footer">
        <Link href="/privacy">Privacy</Link>·
        <Link href="/disclaimer">Disclaimer</Link>·
        <Link href="/faq">?</Link>
      </div>
    </div>
  );
}

export default function ConsulenzaPage() {
  return (
    <Suspense fallback={
      <div className="canvas">
        <div className="topbar">
          <div className="brand">✦ Luna Astrologica</div>
        </div>
        <p style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-dim)' }}>
          Caricamento...
        </p>
      </div>
    }>
      <ConsulenzaContent />
    </Suspense>
  );
}
