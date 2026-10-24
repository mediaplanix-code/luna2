'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const VAPI_NUMBER = "+18563780329"; // Formato internazionale senza spazi

function ConsulenzaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focus = searchParams.get('focus') || 'generico';

  const [nome, setNome] = useState('');

  useEffect(() => {
    const nomeSalvato = localStorage.getItem('luna2_nome');
    if (nomeSalvato) setNome(nomeSalvato);
  }, []);

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
        padding: '20px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginBottom: '12px' }}>
          Chiama questo numero per iniziare:
        </p>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#F5A623', letterSpacing: '1px' }}>
          +1 (856) 378 0329
        </div>
      </div>

      <a 
        href={`tel:${VAPI_NUMBER}`}
        className="cta"
        style={{ 
          display: 'block', 
          textAlign: 'center', 
          textDecoration: 'none',
          fontSize: '16px',
          padding: '16px',
          marginBottom: '12px'
        }}
      >
        Chiama ora
      </a>

      <div style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--text)', marginBottom: '20px', marginTop: '24px' }}>
        <p style={{ marginBottom: '12px' }}>
          <strong>Cosa include:</strong>
        </p>
        <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
          <li>15 minuti di conversazione al telefono</li>
          <li>Analisi del tuo tema natale e dei transiti attuali</li>
          <li>Risposte alle tue domande specifiche</li>
        </ul>
        {nome && (
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
            Ciao {nome}, chiama quando vuoi. Luna ti risponderà personalmente.
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
