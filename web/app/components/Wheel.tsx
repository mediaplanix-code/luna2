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

interface Props {
  planets: Record<string, { longitude: number; segno: string; grado: number }>;
  ascendant?: number;
  size?: number;
}

export default function Wheel({ planets, ascendant = 0, size = 340 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r_ext = size / 2 - 6;
  const r_sign = r_ext - 26;
  const r_planets = r_sign - 34;
  const r_inner = r_planets - 22;

  // L'Ascendente è messo a sinistra (ore 9), quindi ruotiamo tutto
  // in modo che ascendant stia a 180° dal centro
  const offset = 180 - ascendant;

  // Converte longitudine eclittica in coordinate cartesiane SVG
  // Nota: in astrologia lo zodiaco gira in senso antiorario
  function pos(lon: number, raggio: number) {
    const angle = (offset + lon) * Math.PI / 180;
    // -1 sul seno per senso antiorario
    const x = cx + raggio * Math.cos(angle);
    const y = cy - raggio * Math.sin(angle);
    return { x, y };
  }

  return (
    <svg width="100%" viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: size, display: 'block', margin: '0 auto' }}>
      {/* Cerchio esterno */}
      <circle cx={cx} cy={cy} r={r_ext} fill="none" stroke="#F5A623" strokeWidth="1.5" />
      {/* Cerchio segni */}
      <circle cx={cx} cy={cy} r={r_sign} fill="none" stroke="#232A42" strokeWidth="1" />
      {/* Cerchio interno (pianeti) */}
      <circle cx={cx} cy={cy} r={r_inner} fill="none" stroke="#232A42" strokeWidth="1" />

      {/* Linee dei 12 settori + simboli dei segni */}
      {SEGNI.map((s, i) => {
        const startLon = i * 30;
        const p1 = pos(startLon, r_ext);
        const p2 = pos(startLon, r_sign);
        const mid = pos(startLon + 15, (r_ext + r_sign) / 2);
        return (
          <g key={s}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#232A42" strokeWidth="1" />
            <text
              x={mid.x}
              y={mid.y}
              fill="#F5A623"
              fontSize="14"
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="serif"
            >
              {SIMBOLI[s]}
            </text>
          </g>
        );
      })}

      {/* Ascendente: linea marcata + etichetta */}
      {(() => {
        const p1 = pos(ascendant, r_ext);
        const p2 = pos(ascendant, r_inner);
        return (
          <g>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#F5A623" strokeWidth="1.5" />
            <text
              x={p1.x + (p1.x < cx ? -14 : 14)}
              y={p1.y + (p1.y < cy ? -6 : 14)}
              fill="#F5A623"
              fontSize="10"
              textAnchor="middle"
              fontWeight="700"
            >
              ASC
            </text>
          </g>
        );
      })()}

      {/* Pianeti */}
      {Object.entries(planets).map(([nome, p]) => {
        const coords = pos(p.longitude, r_planets);
        const simb = PIANETI_SIMB[nome] || nome[0];
        return (
          <g key={nome}>
            <circle cx={coords.x} cy={coords.y} r="2" fill="#F5A623" />
            <text
              x={coords.x}
              y={coords.y - 6}
              fill="#F5F0E6"
              fontSize="13"
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="serif"
            >
              {simb}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
