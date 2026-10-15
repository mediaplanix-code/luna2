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

const COLORI_SPICCHI: string[] = [
  '#8B2E3F', '#2E5C8B', '#8B6F2E', '#2E8B6F',
  '#6F2E8B', '#8B4A2E', '#2E8B4A', '#8B2E6F',
  '#4A2E8B', '#8B8B2E', '#2E4A8B', '#8B2E2E',
];

const COLORI_ASPETTI: Record<string,string> = {
  trigono: '#06D6A0',
  sestile: '#5BC0EB',
  quadratura: '#EF476F',
  opposizione: '#9D4EDD',
  congiunzione: '#F5A623',
};

interface Props {
  planets: Record<string, { longitude: number; segno: string; grado: number }>;
  aspects?: Array<{ pianeta1: string; pianeta2: string; tipo: string; orb: number }>;
  ascendant?: number;
  houses?: number[];
  size?: number;
}

export default function Wheel({
  planets,
  aspects = [],
  ascendant = 0,
  houses = [],
  size = 560,
}: Props) {
  const cx = size / 2;
  const cy = size / 2;

  const r_out       = size / 2 - 2;
  const r_zod_out   = r_out - 2;
  const r_zod_in    = r_zod_out - 58;
  const r_case_out  = r_zod_in - 2;
  const r_case_in   = r_case_out - 34;
  const r_plan      = r_case_in - 58;
  const r_asp       = r_plan - 14;

  const offset = 180 - ascendant;

  function pos(lon: number, raggio: number) {
    const angle = (offset + lon) * Math.PI / 180;
    return {
      x: cx + raggio * Math.cos(angle),
      y: cy - raggio * Math.sin(angle),
    };
  }

  function settore(lonStart: number, lonEnd: number, r1: number, r2: number) {
    const p1 = pos(lonStart, r1);
    const p2 = pos(lonStart, r2);
    const p3 = pos(lonEnd, r2);
    const p4 = pos(lonEnd, r1);
    const largeArc = (lonEnd - lonStart) > 180 ? 1 : 0;
    return [
      `M ${p1.x} ${p1.y}`,
      `L ${p2.x} ${p2.y}`,
      `A ${r2} ${r2} 0 ${largeArc} 1 ${p3.x} ${p3.y}`,
      `L ${p4.x} ${p4.y}`,
      `A ${r1} ${r1} 0 ${largeArc} 0 ${p1.x} ${p1.y}`,
      'Z',
    ].join(' ');
  }

  const pianetiOrdinati = Object.entries(planets)
    .map(([nome, p]) => ({ nome, ...p }))
    .sort((a, b) => a.longitude - b.longitude);

  const pianetiSpostati: Array<{ nome: string; longitude: number; grado: number; origLon: number }> = [];
  const MIN_DIST = 10;
  for (const p of pianetiOrdinati) {
    let lon = p.longitude;
    for (const prev of pianetiSpostati) {
      const diff = ((lon - prev.longitude + 540) % 360) - 180;
      if (Math.abs(diff) < MIN_DIST) {
        lon = (prev.longitude + MIN_DIST) % 360;
      }
    }
    pianetiSpostati.push({ ...p, longitude: lon, origLon: p.longitude });
  }

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${size} ${size}`}
      style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }}
      fontFamily="Georgia, 'Times New Roman', serif"
    >
      <defs>
        <radialGradient id="fondoRuota" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0F1424" />
          <stop offset="100%" stopColor="#0A0E1A" />
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r={r_out} fill="url(#fondoRuota)" />
      <circle cx={cx} cy={cy} r={r_out} fill="none" stroke="#F5A623" strokeWidth="2" />

      {SEGNI.map((s, i) => {
        const start = i * 30;
        const end = start + 30;
        const colore = COLORI_SPICCHI[i];
        const centro = pos(start + 15, (r_zod_out + r_zod_in) / 2 + 6);
        const nomePos = pos(start + 15, r_zod_in + 14);
        return (
          <g key={s}>
            <path
              d={settore(start, end, r_zod_in, r_zod_out)}
              fill={colore}
              fillOpacity="0.55"
              stroke="#F5F0E6"
              strokeWidth="0.6"
              strokeOpacity="0.3"
            />
            {/* Simbolo zodiacale — raddoppiato */}
            <text
              x={centro.x}
              y={centro.y}
              fill="#FFFFFF"
              fontSize="40"
              textAnchor="middle"
              dominantBaseline="middle"
              fontWeight="700"
            >
              {SIMBOLI[s]}
            </text>
            {/* Nome segno — raddoppiato */}
            <text
              x={nomePos.x}
              y={nomePos.y}
              fill="#F5F0E6"
              fontSize="13"
              textAnchor="middle"
              dominantBaseline="middle"
              fontWeight="700"
              letterSpacing="1"
            >
              {s.toUpperCase()}
            </text>
          </g>
        );
      })}

      <circle cx={cx} cy={cy} r={r_zod_out} fill="none" stroke="#F5A623" strokeWidth="1" strokeOpacity="0.6" />
      <circle cx={cx} cy={cy} r={r_zod_in} fill="none" stroke="#F5A623" strokeWidth="1" strokeOpacity="0.6" />
      <circle cx={cx} cy={cy} r={r_case_out} fill="none" stroke="#2A3450" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={r_case_in} fill="none" stroke="#2A3450" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={r_plan} fill="none" stroke="#2A3450" strokeWidth="0.6" strokeDasharray="2 4" />

      {houses.length === 12 && houses.map((cusp, i) => {
        const p1 = pos(cusp, r_case_out);
        const p2 = pos(cusp, r_case_in);
        const next = houses[(i + 1) % 12];
        let midLon = cusp + ((next - cusp + 360) % 360) / 2;
        midLon = midLon % 360;
        const numPos = pos(midLon, (r_case_out + r_case_in) / 2);
        return (
          <g key={`casa-${i}`}>
            <line
              x1={p1.x} y1={p1.y}
              x2={p2.x} y2={p2.y}
              stroke="#5A6072"
              strokeWidth="1"
              strokeOpacity="0.8"
            />
            {/* Numero casa — raddoppiato */}
            <text
              x={numPos.x}
              y={numPos.y}
              fill="#B0B8D0"
              fontSize="20"
              textAnchor="middle"
              dominantBaseline="middle"
              fontWeight="700"
            >
              {i + 1}
            </text>
          </g>
        );
      })}

      <circle cx={cx} cy={cy} r={r_asp - 12} fill="#0A0E1A" stroke="#2A3450" strokeWidth="0.6" />

      {aspects
        .filter(a => a.orb < 6)
        .slice(0, 18)
        .map((a, i) => {
          const p1 = planets[a.pianeta1];
          const p2 = planets[a.pianeta2];
          if (!p1 || !p2) return null;
          const colore = COLORI_ASPETTI[a.tipo] || '#5A6072';
          const c1 = pos(p1.longitude, r_asp - 12);
          const c2 = pos(p2.longitude, r_asp - 12);
          return (
            <line
              key={i}
              x1={c1.x} y1={c1.y}
              x2={c2.x} y2={c2.y}
              stroke={colore}
              strokeWidth="1.2"
              opacity="0.55"
            />
          );
        })}

      {(() => {
        const ascOut = pos(ascendant, r_out - 4);
        const ascIn = pos(ascendant, r_plan - 4);
        const label = pos(ascendant, r_out + 16);
        return (
          <g>
            <line
              x1={ascOut.x} y1={ascOut.y}
              x2={ascIn.x} y2={ascIn.y}
              stroke="#F5A623"
              strokeWidth="3"
            />
            {/* ASC — raddoppiato */}
            <text
              x={label.x} y={label.y}
              fill="#F5A623" fontSize="18" fontWeight="700"
              textAnchor="middle" dominantBaseline="middle"
            >
              ASC
            </text>
          </g>
        );
      })()}

      {pianetiSpostati.map((p) => {
        const coords = pos(p.longitude, r_plan);
        const orig = pos(p.origLon, r_plan);
        const tick1 = pos(p.origLon, r_plan + 20);
        const tick2 = pos(p.origLon, r_plan - 20);
        const simb = PIANETI_SIMB[p.nome] || p.nome[0];
        return (
          <g key={p.nome}>
            <line
              x1={tick1.x} y1={tick1.y}
              x2={tick2.x} y2={tick2.y}
              stroke="#F5A623"
              strokeWidth="1"
              opacity="0.6"
            />
            {Math.abs(p.longitude - p.origLon) > 0.5 && (
              <line
                x1={orig.x} y1={orig.y}
                x2={coords.x} y2={coords.y}
                stroke="#8A94B0"
                strokeWidth="0.6"
                opacity="0.6"
              />
            )}
            {/* Cerchio dietro pianeta — più grande */}
            <circle cx={coords.x} cy={coords.y} r="22" fill="#0A0E1A" stroke="#F5A623" strokeWidth="1.2" />
            {/* Glifo pianeta — raddoppiato */}
            <text
              x={coords.x}
              y={coords.y - 2}
              fill="#F5F0E6"
              fontSize="26"
              textAnchor="middle"
              dominantBaseline="middle"
              fontWeight="700"
            >
              {simb}
            </text>
            {/* Grado sotto — raddoppiato */}
            <text
              x={coords.x}
              y={coords.y + 34}
              fill="#F5A623"
              fontSize="14"
              textAnchor="middle"
              dominantBaseline="middle"
              fontWeight="700"
            >
              {Math.floor(p.grado)}°
            </text>
          </g>
        );
      })}

      {/* Legenda aspetti — più leggibile */}
      <g transform={`translate(14, ${size - 96})`}>
        {Object.entries(COLORI_ASPETTI).map(([tipo, col], i) => (
          <g key={tipo} transform={`translate(0, ${i * 18})`}>
            <line x1="0" y1="5" x2="22" y2="5" stroke={col} strokeWidth="3" />
            <text x="28" y="5" fill="#B0B8D0" fontSize="13" dominantBaseline="middle">
              {tipo}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
