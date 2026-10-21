'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focus = searchParams.get('focus');
  const nomeB = searchParams.get('nome_b');

  const [token, setToken] = useState<string | null>(null);
  const [domanda, setDomanda] = useState('');
  const [risposta, setRisposta] = useState('');
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState('');
  const [domandeUsate, setDomandeUsate] = useState(0);
  const [domandeLimite, setDomandeLimite] = useState(3);
  const [bloccato, setBloccato] = useState(false);

  const fondoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = localStorage.getItem('luna2_token');
    if (!t) {
      router.push('/accedi');
      return;
    }
    setToken(t);

    fetch(`https://luna2-api.onrender.com/sala/${t}`)
      .then(r => r.json())
      .then(d => {
        if (d.profile) {
          const usate = d.profile.chat_questions_used || 0;
          setDomandeUsate(usate);
          setDomandeLimite(3);
          if (usate >= 3) setBloccato(true);
        }
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    fondoRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [risposta]);

  async function invia(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !domanda.trim() || invio || bloccato) return;

    const testo = domanda.trim();
    setInvio(true);
    setErrore('');
    setRisposta('');

    try {
      const url = `https://luna2-api.onrender.com/chat/${token}${focus ? `?focus=${focus}` : ''}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domanda: testo,
          storico: [],
        }),
      });

      const data = await res.json();

      if (res.status === 402) {
        setBloccato(true);
        setErrore('Hai esaurito le domande gratuite.');
        return;
      }

      if (!res.ok) throw new Error(data.detail || `Errore ${res.status}`);

      setRisposta(data.risposta || '');
      const nuoveUsate = (domandeUsate || 0) + 1;
      setDomandeUsate(nuoveUsate);
      if (nuoveUsate >= 3) setBloccato(true);
    } catch (err: any) {
      setErrore(err.message || 'Errore di rete');
    } finally {
      setInvio(false);
    }
  }

  function nuovaDomanda() {
    setDomanda('');
    setRisposta('');
    setErrore('');
  }

  const rimaste = Math.max(0, domandeLimite - domandeUsate);
  
  const isCompatibilita = focus && focus.startsWith('compatibilita');
  const isTema = focus && focus.startsWith('tema');
  
  let titolo = "Parla con la tua astrologa";
  
  if (isCompatibilita) {
    const argomento = focus.replace('compatibilita_', '');
    const mappaArgomenti: Record<string, string> = {
      'amore': 'Amore',
      'lavoro': 'Lavoro',
      'salute': 'Salute',
      'crescita': 'Crescita Personale',
      'previsioni': 'Previsioni',
      'generico': 'Generale'
    };
    const nomeArgomento = mappaArgomenti[argomento] || 'Compatibilità';
    titolo = `Approfondimento ${nomeArgomento}${nomeB ? ` tra te e ${nomeB}` : ''}`;
  } else if (isTema) {
    const argomento = focus.replace('tema_', '');
    const mappaArgomenti: Record<string, string> = {
      'amore': 'Amore',
      'lavoro': 'Lavoro',
      'salute': 'Salute',
      'crescita': 'Crescita Personale',
      'previsioni': 'Previsioni'
    };
    const nomeArgomento = mappaArgomenti[argomento] || 'Tema Natale';
    titolo = `Approfondimento ${nomeArgomento}`;
  }

  // Link di ritorno corretto
  const backLink = isCompatibilita ? "/compatibilita" : "/sala";
  const backText = isCompatibilita ? "← Compatibilità" : "← Sala";

  return (
    <div className="canvas">
      <div className="topbar">
        <Link href={backLink} className="back">
          {backText}
        </Link>
        <div className="brand">✦ Luna Astrologica</div>
      </div>

      <h1 style={{
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        fontWeight: 400,
        textAlign: 'center',
        marginBottom: '6px'
      }}>
        {titolo}
      </h1>
      <p style={{
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--text-dim)',
        marginBottom: '22px'
      }}>
        {bloccato
          ? 'Hai esaurito le domande gratuite.'
          : `Ti restano ${rimaste} domande gratuite.`}
      </p>

      {!bloccato && !risposta && (
        <form onSubmit={invia}>
          <div className="field">
            <label>La tua domanda</label>
            <textarea
              value={domanda}
              onChange={(e) => setDomanda(e.target.value)}
              placeholder="Scrivi qui la tua domanda…"
              rows={4}
              disabled={invio}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(245,166,35,0.25)',
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--text)',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={invio || !domanda.trim()}
            className="cta"
            style={{ marginTop: '14px' }}
          >
            {invio ? 'Sto consultando il cielo…' : 'Chiedi'}
          </button>

          {errore && (
            <div className="error" style={{ marginTop: '14px' }}>
              {errore}
            </div>
          )}
        </form>
      )}

      {risposta && (
        <div>
          <div style={{
            padding: '16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(245,166,35,0.2)',
            borderRadius: '10px',
            color: 'var(--text)',
            fontSize: '14px',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
          }}>
            {risposta}
          </div>

          {!bloccato ? (
            <button
              type="button"
              onClick={nuovaDomanda}
              className="cta"
              style={{ marginTop: '14px' }}
            >
              Fai un&apos;altra domanda
            </button>
          ) : (
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Link href={`/consulenza${focus ? `?focus=${focus}` : ''}`} className="cta" style={{ display: 'inline-block' }}>
                Prenota un consulto · €19
              </Link>
            </div>
          )}
        </div>
      )}

      {bloccato && !risposta && (
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <Link href={`/consulenza${focus ? `?focus=${focus}` : ''}`} className="cta" style={{ display: 'inline-block' }}>
            Prenota un consulto · €19
          </Link>
        </div>
      )}

      <div ref={fondoRef} />

      {isCompatibilita && (
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <Link href="/compatibilita" className="cta" style={{ background: 'transparent', border: '1px solid var(--text-dim)', color: 'var(--text-dim)', display: 'inline-block' }}>
            ← Torna alla compatibilità
          </Link>
        </div>
      )}

      <div className="footer">
        <Link href="/privacy">Privacy</Link>·
        <Link href="/disclaimer">Disclaimer</Link>·
        <Link href="/faq">?</Link>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="canvas"><p style={{ textAlign: 'center', marginTop: '40px' }}>Caricamento...</p></div>}>
      <ChatContent />
    </Suspense>
  );
}
