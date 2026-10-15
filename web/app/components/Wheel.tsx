'use client';

const SEGNI = ['Ariete','Toro','Gemelli','Cancro','Leone','Vergine',
  'Bilancia','Scorpione','Sagittario','Capricorno','Acquario','Pesci'];

const SIMBOLI: Record<string,string> = {
  Ariete:'♈', Toro:'♉', Gemelli:'♊', Cancro:'♋', Leone:'♌', Vergine:'♍',
  Bilancia:'♎', Scorpione:'♏', Sagittario:'♐', Capricorno:'♑', Acquario:'♒', Pesci:'♓',
};

const PIANETI_SIMB: Record<string,string> = {
  Sole:'☉', Luna:'☽', Mercurio:'☿', Venere:'♀', Marte:'♂',
  Giove:'♃', Saturno:'♄', Urano:'♅', Nettuno:'♆', Plutone:'♇',
  NodoNord:'☊', Chirone:'⚷',
};

// Colori per gli aspetti principali
const COLORI_ASPETTI: Record<string,string> = {
  congiunzione: '#F5A623',
  sestile: '#5BC0EB',
  quadratura: '#EF476F',
  trigono: '#06D6A0',
  opposizione: '#9D4EDD',
};

interface Props {
  planets: Record<string, { longitude: number; segno: string; grado: number }>;
  aspects?: Array<{ pianeta1: string; pianeta2: string; tipo: string; orb: number }>;
  ascendant?: number;
  size?: number;
}

export default function Wheel({ planets, aspects = [], ascendant = 0, size = 460 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r_out = size / 2 - 4;        // bordo esterno
  const r_segni_out = r_out - 4;
  const r_segni_in = r_segni_out - 36;  // fascia dei segni
  const r_pianeti = r_segni_in - 30;    // fascia pianeti
  const r_case = r_pianeti - 20;        // cerchio case
  const r_aspetti = r_case - 30;        // raggio per disegnare le linee di aspetto

  // Orientamento: Ascendente a sinistra (180° schermo)
  const offset = 180 - ascendant;

  function pos(lon: number, raggio: number) {
    const angle = (offset + lon) * Math.PI / 180;
    const x = cx + raggio * Math.cos(angle);
    const y = cy - raggio * Math.sin(angle);
    return { x, y };
  }

  // Percorso per uno spicchio anulare (settore tra due raggi)
  function settore(lonStart: number, lonEnd: number, r1: number, r2: number) {
    const p1 = pos(lonStart, r1);
    const p2 = pos(lonStart, r2);
    const p3 = pos(lonEnd, r2);
    const p4 = pos(lonEnd, r1);
    const largeArc = (lonEnd - lonStart) > 180 ? 1 : 0;
    // SVG: spostamento "antiorario" ma con y invertito diventa orario. Uso sweep=1
    return [
      `M ${p1.x} ${p1.y}`,
      `L ${p2.x} ${p2.y}`,
      `A ${r2} ${r2} 0 ${largeArc} 1 ${p3.x} ${p3.y}`,
      `L ${p4.x} ${p4.y}`,
      `A ${r1} ${r1} 0 ${largeArc} 0 ${p1.x} ${p1.y}`,
      'Z',
    ].join(' ');
  }

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${size} ${size}`}
      style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }}
    >
      {/* Sfondo cerchio interno */}
      <circle cx={cx} cy={cy} r={r_case} fill="#0F1424" />

      {/* 12 spicchi con colori alternati */}
      {SEGNI.map((s, i) => {
        const start = i * 30;
        const end = start + 30;
        const colore = i % 2 === 0 ? '#161B2C' : '#1A2033';
        const mid = pos(start + 15, (r_segni_out + r_segni_in) / 2);
        return (
          <g key={s}>
            <path d={settore(start, end, r_segni_in, r_segni_out)} fill={colore} stroke="#232A42" strokeWidth="1" />
            <text
              x={mid.x}
              y={mid.y}
              fill="#F5A623"
              fontSize="18"
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="serif"
            >
              {SIMBOLI[s]}
            </text>
          </g>
        );
      })}

      {/* Cerchi guida */}
      <circle cx={cx} cy={cy} r={r_segni_out} fill="none" stroke="#232A42" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={r_segni_in} fill="none" stroke="#232A42" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={r_pianeti} fill="none" stroke="#232A42" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={r_case} fill="none" stroke="#232A42" strokeWidth="1" />

      {/* Linee degli aspetti al centro */}
      {aspects.slice(0, 20).map((a, i) => {
        const p1 = planets[a.pianeta1];
        const p2 = planets[a.pianeta2];
        if (!p1 || !p2) return null;
        const colore = COLORI_ASPETTI[a.tipo] || '#5A6072';
        const c1 = pos(p1.longitude, r_aspetti);
        const c2 = pos(p2.longitude, r_aspetti);
        return (
          <line
            key={i}
            x1={c1.x} y1={c1.y}
            x2={c2.x} y2={c2.y}
            stroke={colore}
            strokeWidth="1"
            opacity="0.45"
          />
        );
      })}

      {/* Pianeti */}
      {Object.entries(planets).map(([nome, p]) => {
        const coords = pos(p.longitude, r_pianeti);
        const simb = PIANETI_SIMB[nome] || nome[0];
        return (
          <g key={nome}>
            <circle cx={coords.x} cy={coords.y} r="3" fill="#F5A623" />
            <text
              x={coords.x}
              y={coords.y - 10}
              fill="#F5F0E6"
              fontSize="16"
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="serif"
              fontWeight="500"
            >
              {simb}
            </text>
          </g>
        );
      })}

      {/* Ascendente: linea marcata + etichetta */}
      {(() => {
        const p1 = pos(ascendant, r_segni_out);
        const p2 = pos(ascendant, r_case);
        const labelPos = pos(ascendant, r_segni_out + 18);
        return (
          <g>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#F5A623" strokeWidth="2" />
            <text
              x={labelPos.x}
              y={labelPos.y}
              fill="#F5A623"
              fontSize="11"
              textAnchor="middle"
              dominantBaseline="middle"
              fontWeight="700"
            >
              ASC
            </text>
          </g>
        );
      })()}
    </svg>
  );
}
