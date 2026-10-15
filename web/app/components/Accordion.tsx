'use client';

import { useState } from 'react';

interface Props {
  title: string;
  children: React.ReactNode;
  bare?: boolean;
}

export default function Accordion({ title, children, bare }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`acc-item ${bare ? 'bare' : ''} ${open ? 'open' : ''}`}>
      <div className="acc-head" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span className="arrow">▾</span>
      </div>
      <div className="acc-body">
        <div className="acc-body-inner">{children}</div>
      </div>
    </div>
  );
}
