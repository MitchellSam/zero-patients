import { CITIES, CITY_IDS, type CityId, type GameSnapshot } from '@zero-patients/shared';
import { DISEASE_COLORS, PLAYER_COLORS } from '../lib/game.js';

const W = 1920;
const H = 1080;

// undirected route list, computed once
const EDGES: [CityId, CityId][] = [];
{
  const seen = new Set<string>();
  const skip = new Set(['los-angeles|sydney', 'manila|san-francisco', 'san-francisco|tokyo']);
  for (const id of CITY_IDS)
    for (const n of CITIES[id].neighbors) {
      const key = [id, n].sort().join('|');
      if (!seen.has(key) && !skip.has(key)) {
        seen.add(key);
        EDGES.push([id, n as CityId]);
      }
    }
}

// trans-pacific routes exit the map edges (dashed)
const WRAP: [CityId, number, number][] = [
  ['san-francisco', 0, 0.43], ['san-francisco', 0, 0.53], ['los-angeles', 0, 0.64],
  ['tokyo', W, 0.44], ['manila', W, 0.58], ['sydney', W, 0.64],
];

const BLOBS: [number, number, number, number][] = [
  [340, 360, 300, 190], [560, 780, 170, 230], [950, 330, 180, 120],
  [990, 640, 190, 230], [1380, 420, 330, 210], [1700, 830, 160, 110],
];

const px = (id: CityId) => CITIES[id].x * W;
const py = (id: CityId) => CITIES[id].y * H;

export default function BoardMap({ snapshot }: { snapshot: GameSnapshot }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
      <g>
        {Array.from({ length: Math.ceil(W / 96) + 1 }, (_, i) => (
          <line key={`v${i}`} x1={i * 96} y1={0} x2={i * 96} y2={H} stroke="rgba(120,160,220,0.045)" />
        ))}
        {Array.from({ length: Math.ceil(H / 96) + 1 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={i * 96} x2={W} y2={i * 96} stroke="rgba(120,160,220,0.045)" />
        ))}
      </g>
      <g opacity={0.4}>
        {BLOBS.map(([cx, cy, rx, ry], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill="rgba(90,130,190,0.05)" style={{ filter: 'blur(40px)' }} />
        ))}
      </g>
      <g stroke="rgba(110,150,210,0.16)" strokeWidth={1}>
        {EDGES.map(([a, b]) => (
          <line key={`${a}|${b}`} x1={px(a)} y1={py(a)} x2={px(b)} y2={py(b)} />
        ))}
        {WRAP.map(([id, x, yf], i) => (
          <line key={`w${i}`} x1={px(id)} y1={py(id)} x2={x} y2={yf * H} strokeDasharray="3 7" />
        ))}
      </g>

      {CITY_IDS.map((id) => {
        const c = CITIES[id];
        const col = DISEASE_COLORS[c.color];
        const cubes = snapshot.cubes[id] ?? { blue: 0, yellow: 0, black: 0, red: 0 };
        const infected = (Object.entries(cubes) as [string, number][]).filter(([, n]) => n > 0);
        const total = infected.reduce((a, [, n]) => a + n, 0);
        const hasStation = snapshot.researchStations.includes(id);
        const x = px(id);
        const y = py(id);
        let cubeIdx = 0;
        return (
          <g key={id}>
            {total > 0 && (
              <circle className="halo" cx={x} cy={y} r={15} fill="none" stroke={col} strokeWidth={1.5}
                style={{ animationDelay: `${(x % 9) / 5}s` }} />
            )}
            {hasStation && (
              <path d={`M ${x} ${y - 18} l 9 9 l -9 9 l -9 -9 Z`} fill="none" stroke="#e2e8f0" strokeWidth={1.5}
                style={{ filter: 'drop-shadow(0 0 5px rgba(226,232,240,0.7))' }} />
            )}
            <circle cx={x} cy={y} r={total ? 6 : 4.5} fill={col} fillOpacity={total ? 1 : 0.8}
              style={{ filter: `drop-shadow(0 0 ${total ? 10 : 5}px ${col})` }} />
            {infected.flatMap(([color, n]) =>
              Array.from({ length: n }, () => {
                const i = cubeIdx++;
                return (
                  <rect key={`${color}${i}`} x={x - (total * 9 - 2.5) / 2 + i * 9} y={y + 12}
                    width={6.5} height={6.5} rx={1.5} fill={DISEASE_COLORS[color as keyof typeof DISEASE_COLORS]}
                    style={{ filter: `drop-shadow(0 0 4px ${DISEASE_COLORS[color as keyof typeof DISEASE_COLORS]})` }} />
                );
              })
            )}
            <text className={`citylabel${total ? ' hot' : ''}`} x={x} y={y - 14}>{c.name}</text>
          </g>
        );
      })}

      {snapshot.players.map((p, i) => {
        const x = px(p.location as CityId) + 16;
        const y = py(p.location as CityId) - 4 - (i % 2) * 12 + Math.floor(i / 2) * 24;
        const col = PLAYER_COLORS[i % PLAYER_COLORS.length]!;
        return (
          <g key={p.id}>
            <circle cx={x} cy={y} r={6} fill={col} style={{ filter: `drop-shadow(0 0 7px ${col})` }} />
            <circle cx={x} cy={y} r={9} fill="none" stroke={col} strokeWidth={1.2} opacity={0.55} />
          </g>
        );
      })}
    </svg>
  );
}
