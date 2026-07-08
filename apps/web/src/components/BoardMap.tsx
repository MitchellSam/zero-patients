import { useEffect, useRef, useState } from 'react';
import { CITIES, CITY_IDS, type CityId, type DiseaseColor, type GameSnapshot } from '@zero-patients/shared';
import { DISEASE_COLORS, PLAYER_COLORS } from '../lib/game.js';

const W = 1920;
const H = 1080;
const MIN_VIEW_W = W / 4; // 4× max zoom

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

// classic board-game meeple, 100×100 box, feet on y=97
const MEEPLE_PATH =
  'M50 6 C60 6 68 14 68 24 C68 30 65 35 61 38 C75 42 88 50 88 60 L88 64 ' +
  'C88 67 86 69 83 69 L64 69 C66 80 74 88 74 92 C74 95 72 97 69 97 L56 97 ' +
  'L50 84 L44 97 L31 97 C28 97 26 95 26 92 C26 88 34 80 36 69 L17 69 ' +
  'C14 69 12 67 12 64 L12 60 C12 50 25 42 39 38 C35 35 32 30 32 24 C32 14 40 6 50 6 Z';

/** Small building for research stations — roof, walls, glowing door. */
function Station({ x, y }: { x: number; y: number }) {
  return (
    <g style={{ filter: 'drop-shadow(0 0 6px rgba(226,232,240,0.75))' }}>
      <path
        d={`M ${x - 11} ${y} L ${x} ${y - 9} L ${x + 11} ${y} V ${y + 9} H ${x - 11} Z`}
        fill="#dde5f0"
        stroke="#0a0f1a"
        strokeWidth={1.5}
      />
      <rect x={x - 2.5} y={y + 2} width={5} height={7} fill="#0a0f1a" rx={1} />
    </g>
  );
}

function Meeple({ x, y, color }: { x: number; y: number; color: string }) {
  // feet planted at (x, y): path feet sit at 97 of a 100-box scaled 0.24 → 23.3 tall
  const s = 0.24;
  return (
    <g transform={`translate(${x - 50 * s}, ${y - 97 * s}) scale(${s})`}>
      <path
        d={MEEPLE_PATH}
        fill={color}
        stroke="#0a0f1a"
        strokeWidth={8}
        style={{ filter: `drop-shadow(0 0 8px ${color})` }}
      />
    </g>
  );
}

const COLOR_ORDER: DiseaseColor[] = ['blue', 'yellow', 'black', 'red'];

interface ViewBox {
  x: number;
  y: number;
  w: number;
}

const clampView = (v: ViewBox): ViewBox => {
  const w = Math.min(Math.max(v.w, MIN_VIEW_W), W);
  const h = (w * H) / W;
  return {
    w,
    x: Math.min(Math.max(v.x, 0), W - w),
    y: Math.min(Math.max(v.y, 0), H - h),
  };
};

export default function BoardMap({
  snapshot,
  recentInfections,
}: {
  snapshot: GameSnapshot;
  /** cities infected in the most recent infection step — they get the pulse */
  recentInfections: ReadonlySet<string>;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<ViewBox>({ x: 0, y: 0, w: W });
  const drag = useRef<{ px: number; py: number; view: ViewBox } | null>(null);

  // wheel zoom anchored at the cursor (non-passive so we can preventDefault)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const fx = (e.clientX - rect.left) / rect.width;
      const fy = (e.clientY - rect.top) / rect.height;
      setView((v) => {
        const w = v.w * (e.deltaY > 0 ? 1.18 : 1 / 1.18);
        const clampedW = Math.min(Math.max(w, MIN_VIEW_W), W);
        return clampView({
          w: clampedW,
          x: v.x + fx * (v.w - clampedW),
          y: v.y + fy * ((v.w * H) / W - (clampedW * H) / W),
        });
      });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    drag.current = { px: e.clientX, py: e.clientY, view };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!d || !rect) return;
    const scale = d.view.w / rect.width;
    setView(clampView({
      w: d.view.w,
      x: d.view.x - (e.clientX - d.px) * scale,
      y: d.view.y - (e.clientY - d.py) * scale,
    }));
  };
  const onPointerUp = () => (drag.current = null);

  // players grouped per city so co-located meeples fan out side by side
  const meeplesByCity = new Map<string, { color: string }[]>();
  snapshot.players.forEach((p, i) => {
    const list = meeplesByCity.get(p.location) ?? [];
    list.push({ color: PLAYER_COLORS[i % PLAYER_COLORS.length]! });
    meeplesByCity.set(p.location, list);
  });

  return (
    <svg
      ref={svgRef}
      className="board-svg"
      viewBox={`${view.x} ${view.y} ${view.w} ${(view.w * H) / W}`}
      preserveAspectRatio="xMidYMid slice"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onDoubleClick={() => setView({ x: 0, y: 0, w: W })}
    >
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
      <g stroke="rgba(130,170,230,0.32)" strokeWidth={1.6}>
        {EDGES.map(([a, b]) => (
          <line key={`${a}|${b}`} x1={px(a)} y1={py(a)} x2={px(b)} y2={py(b)} />
        ))}
        {WRAP.map(([id, x, yf], i) => (
          <line key={`w${i}`} x1={px(id)} y1={py(id)} x2={x} y2={yf * H} strokeDasharray="4 7" />
        ))}
      </g>

      {CITY_IDS.map((id) => {
        const c = CITIES[id];
        const col = DISEASE_COLORS[c.color];
        const cubes = snapshot.cubes[id] ?? { blue: 0, yellow: 0, black: 0, red: 0 };
        const infectedColors = COLOR_ORDER.filter((k) => cubes[k] > 0);
        const total = infectedColors.reduce((a, k) => a + cubes[k], 0);
        const x = px(id);
        const y = py(id);
        const hasMeeples = meeplesByCity.has(id);
        // labels sit below the city (meeples occupy the top), clear of orbit rings
        const orbitExtent = infectedColors.length ? 17 + (infectedColors.length - 1) * 8 + 4 : 0;
        const labelY = y + (orbitExtent ? orbitExtent + 16 : 24);
        return (
          <g key={id}>
            {recentInfections.has(id) && (
              <circle className="halo" cx={x} cy={y} r={15} fill="none" stroke={col} strokeWidth={1.5}
                style={{ animationDelay: `${(x % 9) / 5}s` }} />
            )}
            <circle cx={x} cy={y} r={total ? 6.5 : 5} fill={col} fillOpacity={total ? 1 : 0.85}
              stroke="#0a0f1a" strokeWidth={1.5}
              style={{ filter: `drop-shadow(0 0 ${total ? 10 : 5}px ${col})` }} />

            {/* infection cubes orbit their city — one ring per disease color.
                the whole ring is a single animated group, so cubes always stay
                evenly spaced no matter when they were added */}
            {infectedColors.map((color, ring) => {
              const count = cubes[color];
              const radius = 17 + ring * 8;
              const cc = DISEASE_COLORS[color];
              return (
                <g key={`${color}-${count}`} transform={`rotate(${(x * 7) % 60} ${x} ${y})`}>
                  <g
                    className="orbit"
                    style={{
                      transformOrigin: `${x}px ${y}px`,
                      animationDuration: `${7 + ring * 2.5}s`,
                      animationDirection: ring % 2 ? 'reverse' : 'normal',
                    }}
                  >
                    {Array.from({ length: count }, (_, i) => (
                      <g key={i} transform={`rotate(${(360 / count) * i} ${x} ${y})`}>
                        <rect x={x + radius - 3.5} y={y - 3.5} width={7} height={7} rx={1.5}
                          fill={cc} stroke="#0a0f1a" strokeWidth={1}
                          style={{ filter: `drop-shadow(0 0 4px ${cc})` }} />
                      </g>
                    ))}
                  </g>
                </g>
              );
            })}

            {/* station sits centered above its city, stepping aside for meeples */}
            {snapshot.researchStations.includes(id) &&
              (hasMeeples ? <Station x={x - 22} y={y - 14} /> : <Station x={x} y={y - 18} />)}

            <text className={`citylabel${total ? ' hot' : ''}`} x={x} y={labelY}>{c.name}</text>
          </g>
        );
      })}

      {/* meeples stand on their city, fanned out when sharing one */}
      {[...meeplesByCity.entries()].flatMap(([cityId, list]) => {
        const x = px(cityId as CityId);
        const y = py(cityId as CityId);
        return list.map((m, i) => {
          const offset = (i - (list.length - 1) / 2) * 15;
          return <Meeple key={`${cityId}${i}`} x={x + offset} y={y - 4} color={m.color} />;
        });
      })}
    </svg>
  );
}
