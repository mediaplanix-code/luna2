'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Messaggio = { role: 'user' | 'assistant'; content: string };

export default function ChatPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [messaggi, setMessaggi] = useState<Messaggio[]>([]);
  const [input, setInput] = useState('');
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState('');
  const [domandeUsate, setDomandeUsate] = useState(0);
  const [domandeLimite, setDomandeLimite] = useState(5);
  const [bloccato, setBloccato] = useState(false);

  const fondoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = localStorage.getItem('luna2_token');
    if (!t) {
      router.push('/accedi');
      return;
    }
    setToken(t);
    const n = localStorage.getItem('luna2_nome') || '';
    setNome(n);

    // Carica il profilo per sapere quante domande sono rimaste
    fetch(`https://luna2-api.onrender.com/sala/${t}`)
      .then(r => r.json())
      .then(d => {
        if (d.profile) {
          setDomandeUsate(d.profile.chat_questions_used || 0);
          setDomandeLimite(d.profile.chat_questions_limit || 5);
          if (d.profile.nome) setNome(d.profile.nome);
        }
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    fondoRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messaggi]);

  async function invia(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !input.trim() || invio || bloccato) return;

    const domanda = input.trim();
    setInput('');
    setErrore('');
    const nuoviMessaggi: Messaggio[] = [...messaggi, { role: 'user', content: domanda }];
    setMessaggi(nuoviMessaggi);
    setInvio(true);

    try {
      const res = await fetch(`https://luna2-api.onrender.com/chat/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domanda,
          storico: nuoviMessaggi.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();

      if (res.status === 402) {
        setBloccato(true);
        setErrore(data.detail || 'Hai esaurito le domande gratuite.');
        setMessaggi([...nuoviMessaggi, {
          role: 'assistant',
          content: 'Hai esaurito le domande gratuite. Per continuare, prenota un consulto vocale di 15 minuti (€19).',
        }]);
        return;
      }

      if (!res.ok) throw new Error(data.detail || `Errore ${res.status}`);

      setMessaggi([...nuoviMessaggi, { role: 'assistant', content: data.risposta }]);
      if (typeof data.domande_usate === 'number') setDomandeUsate(data.domande_usate);
      if (typeof data.domande_limite === 'number') setDomandeLimite(data.domande_limite);
    } catch (err: any) {
      setErrore(err.message || 'Errore di rete');
      setMessaggi([...nuoviMessaggi, {
        role: 'assistant',
        content: 'Scusa, c\'è stato un problema. Riprova tra poco.',
      }]);
    } finally {
      setInvio(false);
    }
  }

  const rimaste = Math.max(0, domandeLimite - domandeUsate);

  return (
    <div className="canvas">
      <div className="topbar">
        <Link href="/sala" className="back">← Sala</Link>
        <div className="brand">✦ Luna Astrologica</div>
      </div>

      <h1 style={{
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        fontWeight: 400,
        textAlign: 'center',
        marginBottom: '6px'
      }}>
        Parla con la tua astrologa
      </h1>
      <p style={{
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--text-dim)',
        marginBottom: '18px'
      }}>
        {bloccato
          ? 'Hai esaurito le domande gratuite.'
          : `Ti restano ${rimaste} domande gratuite.`}
      </p>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        minHeight: '340px',
        maxHeight: '60vh',
        overflowY: 'auto',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(245,166,35,0.15)',
        borderRadius: '10px',
      }}>
        {messaggi.length === 0 && (
          <div style={{
            color: 'var(--text-dim)',
            fontSize: '13px',
            textAlign: 'center',
            padding: '30px 10px',
            fontStyle: 'italic',
          }}>
            Fai la tua prima domanda. Puoi chiedere del tuo tema natale, dei transiti,
            delle tue relazioni, del lavoro — quello che ti sta a cuore.
          </div>
        )}

        {messaggi.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '10px 14px',
              borderRadius: '12px',
              background: m.role === 'user'
                ? 'rgba(245,166,35,0.15)'
                : 'rgba(255,255,255,0.05)',
              border: m.role === 'user'
                ? '1px solid rgba(245,166,35,0.35)'
                : '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text)',
              fontSize: '14px',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
            }}
          >
            {m.content}
          </div>
        ))}

        {invio && (
          <div style={{
            alignSelf: 'flex-start',
            padding: '10px 14px',
            color: 'var(--text-dim)',
            fontSize: '13px',
            fontStyle: 'italic',
          }}>
            La tua astrologa sta scrivendo…
          </div>
        )}

        <div ref={fondoRef} />
      </div>

      {errore && !bloccato && (
        <div className="error" style={{ marginTop: '12px' }}>
          {errore}
        </div>
      )}

      {!bloccato ? (
        <form onSubmit={invia} style={{ marginTop: '16px' }}>
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-end',
          }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  invia(e as any);
                }
              }}
              placeholder="Scrivi la tua domanda…"
              rows={2}
              disabled={invio}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(245,166,35,0.25)',
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--text)',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'none',
              }}
            />
            <button
              type="submit"
              disabled={invio || !input.trim()}
              className="cta"
              style={{ minWidth: '90px', marginTop: 0 }}
            >
              {invio ? '…' : 'Invia'}
            </button>
          </div>
        </form>
      ) : (
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <Link href="/consulenza" className="cta" style={{ display: 'inline-block' }}>
            Prenota un consulto · €19
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
