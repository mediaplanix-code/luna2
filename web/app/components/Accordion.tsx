'use client';

import { useState, ReactNode } from 'react';

interface Props {
  title: string;
  children: ReactNode;
  bare?: boolean;
  defaultOpen?: boolean;
}

export default function Accordion({ title, children, bare = false, defaultOpen = false }: Props) {
  const [aperto, setAperto] = useState(defaultOpen);

  return (
    <div style={{ borderBottom: bare ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
      <button
        onClick={() => setAperto(!aperto)}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          color: 'var(--text)',
          textAlign: 'left',
          // Padding uniforme: orizzontale sempre 16px, verticale cambia se è 'bare'
          padding: bare ? '16px' : '16px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '15px',
        }}
      >
        <span style={{ fontWeight: 500 }}>{title}</span>
        <span style={{ transform: aperto ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', fontSize: '12px', width: '20px', textAlign: 'center' }}>
          ▼
        </span>
      </button>
      {aperto && (
        <div style={{ padding: bare ? '0 16px 20px 16px' : '0 16px 20px 16px' }}>
          {children}
        </div>
      )}
    </div>
  );
}
