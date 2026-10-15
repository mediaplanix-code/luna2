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

// Colori elementi: fuoco, terra, aria, acqua
const COLORI_ELEMENTI: string[] = [
  '#E85D3C', // Ariete   fuoco
  '#6B8E3C', // Toro     terra
  '#E8B23C', // Gemelli  aria
  '#3C7FE8', // Cancro   acqua
  '#E85D3C', // Leone    fuoco
  '#6B8E3C', // Vergine  terra
  '#E8B23C', // Bilancia aria
  '#3C7FE8', // Scorpione acqua
  '#E85D3C', // Sagittario fuoco
  '#6B8E3C', // Capricorno terra
  '#E8B23C', // Acquario aria
  '#3C7FE8', // Pesci    acqua
];

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

  // Raggi (dal centro verso l'esterno)
  const r_bordo_out    = size / 2 - 2;
  const r_segni_out    = r_bordo_out - 2;
  const r_segni_in     = r_segni_out - 42;   // fascia dei segni (più larga)
  const r_case_out     = r_segni_in - 2;
  const r_case_in      = r_case_out - 26;    // fascia delle case
  const r_pianeti      = r_case_in - 34;     // fascia dei pianeti
  const r_aspetti      = r_pianeti - 10;     // raggio per linee di aspetto

  // Ascendente a sinistra (ore 9)
  const offset = 180 - ascendant;

  function pos(lon: number, raggio: number) {
    const angle = (offset + lon) * Math.PI / 180;
    const x = cx + raggio * Math.cos(angle);
    const y = cy - raggio * Math.sin(angle);
    return { x, y };
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

  // Raggruppa pianeti vicini per evitare sovrapposizioni (distanza minima 6°)
  const pianetiOrdinati = Object.entries(planets)
    .map(([nome, p]) => ({ nome, ...p }))
    .sort((a, b) => a.longitude - b.longitude);

  const pianetiSpostati: Array<{ nome: string; longitude: number; segno: string; grado: number; origLon: number }> = [];
  const MIN_DIST = 7;
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
      fontFamily="Georgia, serif"
    >
      {/* Sfondo esterno */}
      <circle cx={cx} cy={cy} r={r_bordo_out} fill="#0A0E1A" />
      <circle cx={cx} cy={cy} r={r_bordo_out} fill="none" stroke="#F5A623" strokeWidth="1.5" />

      {/* 12 spicchi zodiacali */}
      {SEGNI.map((s, i) => {
        const start = i * 30;
        const end = start + 30;
        const colore = COLORI_ELEMENTI[i];
        const mid = pos(start + 15, (r_segni_out + r_segni_in) / 2);
        const labelPos = pos(start + 15, r_segni_out - 14);
        return (
          <g key={s}>
            <path
              d={settore(start, end, r_segni_in, r_segni_out)}
              fill={colore}
              fillOpacity="0.18"
              stroke={colore}
              strokeWidth="1"
              strokeOpacity="0.6"
            />
            {/* Simbolo del segno */}
            <text
              x={mid.x}
              y={mid.y - 4}
              fill="#F5F0E6"
              fontSize="20"
              textAnchor="middle"
              dominantBaseline="middle"
              fontWeight="600"
            >
              {SIMBOLI[s]}
            </text>
            {/* Nome abbreviato */}
            <text
              x={labelPos.x}
              y={labelPos.y}
              fill={colore}
              fontSize="8"
              textAnchor="middle"
              dominantBaseline="middle"
              fontWeight="700"
              letterSpacing="0.5"
            >
              {s.slice(0, 3).toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* Anelli */}
      <circle cx={cx} cy={cy} r={r_segni_out} fill="none" stroke="#2A3450" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={r_segni_in} fill="none" stroke="#2A3450" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={r_case_out} fill="none" stroke="#2A3450" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={r_case_in} fill="none" stroke="#2A3450" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={r_pianeti} fill="none" stroke="#2A3450" strokeWidth="0.5" strokeDasharray="2 4" />

      {/* Cerchio centrale */}
      <circle cx={cx} cy={cy} r={r_aspetti - 8} fill="#0F1424" stroke="#2A3450" strokeWidth="1" />

      {/* Linee aspetti */}
      {aspects.slice(0, 30).map((a, i) => {
        const p1 = planets[a.pianeta1];
        const p2 = planets[a.pianeta2];
        if (!p1 || !p2) return null;
        const colore = COLORI_ASPETTI[a.tipo] || '#5A6072';
        const c1 = pos(p1.longitude, r_aspetti - 8);
        const c2 = pos(p2.longitude, r_aspetti - 8);
        return (
          <line
            key={i}
            x1={c1.x} y1={c1.y}
            x2={c2.x} y2={c2.y}
            stroke={colore}
            strokeWidth={a.tipo === 'congiunzione' ? 0.8 : 1.2}
            opacity="0.55"
          />
        );
      })}

      {/* Cuspidi delle case */}
      {Array.from({ length: 12 }).map((_, i) => {
        // Le case vengono passate come cuspidi: qui le ricaviamo dall'ascendente + 30° non è corretto,
        // quindi usiamo solo l'ASC e disegniamo i raggi ogni 30° a partire dall'ASC come indicatore visivo.
        // (la ruota mostra le case reali solo se in futuro passiamo anche le cuspidi)
        return null;
      })}

      {/* Numeri dei settori ogni 30° a partire dall'ASC (indicatori angolari) */}
      {Array.from({ length: 12 }).map((_, i) => {
        const lon = (ascendant + i * 30) % 360;
        const numPos = pos(lon + 15, r_case_in + 13);
        return null; // disabilitato finché non passiamo le cuspidi reali
      })}

      {/* Ascendente e MC */}
      {(() => {
        const ascIn = pos(ascendant, r_case_out);
        const ascOut = pos(ascendant, r_segni_out + 6);
        const ascLabel = pos(ascendant, r_segni_out + 18);
        return (
          <g>
            <line
              x1={ascOut.x} y1={ascOut.y}
              x2={ascIn.x} y2={ascIn.y}
              stroke="#F5A623" strokeWidth="2.5"
            />
            <text
              x={ascLabel.x} y={ascLabel.y}
              fill="#F5A623" fontSize="10" fontWeight="700"
              textAnchor="middle" dominantBaseline="middle"
              letterSpacing="0.5"
            >
              ASC
            </text>
          </g>
        );
      })()}

      {/* Pianeti */}
      {pianetiSpostati.map((p) => {
        const coords = pos(p.longitude, r_pianeti);
        const tickOuter = pos(p.origLon, r_pianeti + 14);
        const tickInner = pos(p.origLon, r_pianeti - 14);
        const simb = PIANETI_SIMB[p.nome] || p.nome[0];
        return (
          <g key={p.nome}>
            {/* Tacca sul grado esatto */}
            <line
              x1={tickOuter.x} y1={tickOuter.y}
              x2={tickInner.x} y2={tickInner.y}
              stroke="#F5A623" strokeWidth="0.8" opacity="0.7"
            />
            {/* Glifo del pianeta */}
            <text
              x={coords.x}
              y={coords.y}
              fill="#F5F0E6"
              fontSize="15"
              textAnchor="middle"
              dominantBaseline="middle"
              fontWeight="600"
            >
              {simb}
            </text>
            {/* Grado accanto (piccolo) */}
            <text
              x={coords.x}
              y={coords.y + 11}
              fill="#8A94B0"
              fontSize="7"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {Math.floor(p.grado)}°
            </text>
          </g>
        );
      })}

      {/* Legenda aspetti in basso a destra */}
      <g transform={`translate(${size - 78}, ${size - 60})`}>
        {Object.entries(COLORI_ASPETTI).map(([tipo, col], i) => (
          <g key={tipo} transform={`translate(0, ${i * 10})`}>
            <line x1="0" y1="3" x2="12" y2="3" stroke={col} strokeWidth="2" />
            <text x="16" y="3" fill="#8A94B0" fontSize="7" dominantBaseline="middle">
              {tipo.slice(0, 5)}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
